const Eth = require('web3-eth')
const AbiCoder = require('web3-eth-abi')
const { keccak256 } = require('web3-utils')

const abi = AbiCoder

function getLeaf(stateID, receiverAddress, stateData) {
  return keccak256(
    abi.encodeParameters(
      ['uint256', 'address', 'bytes'],
      [stateID, receiverAddress, stateData]
    )
  )
}

const eventLog0 = keccak256('StateCommitted(uint256,bool)') // 0x5a22725590b0a51c923940223f7458512164b1113359a735e86e7f27f44791ee

async function fetchFailedStateSyncs(
  web3Provider,
  startBlock = 0,
  stateReceiver = '0x0000000000000000000000000000000000001001',
  blockRange = 50000
) {
  const eth = new Eth(web3Provider)
  const currentBlock = await eth.getBlockNumber()
  let data = []
  fromBlock = currentBlock - blockRange
  toBlock = currentBlock
  let empty = 0

  while (true) {
    const logs = await eth.getPastLogs({
      fromBlock,
      toBlock,
      address: stateReceiver,
      topics: [eventLog0]
    })
    fromBlock -= blockRange
    toBlock -= blockRange
    data.push(logs)

    if (fromBlock < startBlock || (logs.length === 0 && ++empty === 5)) break
  }

  // filter failed state syncs
  data = data
    .flat()
    .filter(
      (log) =>
        log.data !==
        '0x0000000000000000000000000000000000000000000000000000000000000001'
    )

  // can use heimdall api to fetch L1 state sync data
  // https://heimdall-api.polygon.technology/clerk/event-record/{stateId}

  return data
}

module.exports = { getLeaf, fetchFailedStateSyncs }
