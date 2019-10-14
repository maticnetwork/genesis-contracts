const { spawn } = require("child_process")
const program = require("commander")
const fs = require("fs")

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
      // console.log(`stderr: ${data}`)
    })

    ls.on("close", code => {
      console.log(`child process exited with code ${code}`)
      resolve(result.join(""))
    })
  }).then(compiledData => {
    compiledData = compiledData.replace(
      `======= ${contractFile}:${contractName} =======\nBinary of the runtime part: `,
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
    "contracts/MaticChildERC20.sol",
    "MaticChildERC20"
  ),
  compileContract(
    "ChildChainContract",
    "contracts/ChildChain.sol",
    "ChildChain"
  )
]).then(result => {
  const data = {
    chainId: program.borChainId
  }

  result.forEach(r => {
    data[r.key] = r.compiledData
  })

  let genesisString = fs.readFileSync(program.template).toString()
  genesisString = genesisString.replace(/\${(.+)}/gim, function(a, s) {
    return data[s]
  })

  fs.writeFileSync(program.output, genesisString)
})
