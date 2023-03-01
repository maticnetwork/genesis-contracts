const { spawn } = require("child_process")
const program = require("commander")
const nunjucks = require("nunjucks")
const fs = require("fs")
const web3 = require("web3")

const validators = require("./validators")
const blocks = require("./blocks");
const sprintSizes = require("./sprintSizes");

// load and execute bor validator set
require("./generate-borvalidatorset")

program.version("0.0.1")
program.option("-c, --bor-chain-id <bor-chain-id>", "Bor chain id", "15001")
program.option(
  "-o, --output <output-file>",
  "Genesis json file",
  "./genesis.json"
)
program.option(
  "-t, --template <template>",
  "Genesis template json",
  "./genesis-template.json"
)
program.parse(process.argv)

// compile contract
function compileContract(key, contractFile, contractName) {
  return new Promise((resolve, reject) => {
    const ls = spawn("solc", [
      "--bin-runtime",
      "openzeppelin-solidity/=node_modules/openzeppelin-solidity/",
      "solidity-rlp/=node_modules/solidity-rlp/",
      "/=/",
      // "--optimize",
      // "--optimize-runs",
      // "200",
      contractFile
    ])

    const result = []
    ls.stdout.on("data", data => {
      result.push(data.toString())
    })

    ls.stderr.on("data", data => {
      result.push(data.toString())
    })

    ls.on("close", code => {
      console.log(`child process exited with code ${code}`)
      const fn = code === 0 ? resolve : reject
      fn(result.join(""))
    })
  }).then(compiledData => {
    compiledData = compiledData.replace(
      new RegExp(`======= ${contractFile}:${contractName} =======\nBinary of the runtime part:` + '[ ]?'),
      "@@@@"
    )

    const matched = compiledData.match(/@@@@\n([a-f0-9]+)/)
    return { key, compiledData: matched[1], contractName, contractFile }
  })
}

// compile files
Promise.all([
  compileContract(
    "borValidatorSetContract",
    "contracts/BorValidatorSet.sol",
    "BorValidatorSet"
  ),
  compileContract(
    "borStateReceiverContract",
    "contracts/StateReceiver.sol",
    "StateReceiver"
  ),
  compileContract(
    "maticChildERC20Contract",
    "matic-contracts/contracts/child/MRC20.sol",
    "MRC20"
  )
]).then(result => {
  const totalMaticSupply = web3.utils.toBN("10000000000")

  var validatorsBalance = web3.utils.toBN(0)
  validators.forEach(v => {
    validatorsBalance = validatorsBalance.add(web3.utils.toBN(v.balance))
    v.balance = web3.utils.toHex(web3.utils.toWei(String(v.balance)))
  })

  const contractBalance = totalMaticSupply.sub(validatorsBalance)
  const data = {
    chainId: program.borChainId,
    validators: validators,
    maticChildERC20ContractBalance: web3.utils.toHex(
      web3.utils.toWei(contractBalance.toString())
    ),
    blocks: blocks,
    sprintSizes: sprintSizes
  }

  result.forEach(r => {
    data[r.key] = r.compiledData
  })

  const templateString = fs.readFileSync(program.template).toString()
  const resultString = nunjucks.renderString(templateString, data)
  fs.writeFileSync(program.output, resultString)
}).catch(err => {
  console.log(err)
  process.exit(1)
})
