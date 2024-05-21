const { assert } = require('chai')
const ethUtils = require('ethereumjs-util')
const { keccak256, randomHex } = require('web3-utils')
const TestStateReceiver = artifacts.require('TestStateReceiver')
const TestCommitState = artifacts.require('TestCommitState')
const TestReenterer = artifacts.require('TestReenterer')
const TestRevertingReceiver = artifacts.require('TestRevertingReceiver')
const SparseMerkleTree = require('./util/merkle')
const { getLeaf, fetchFailedStateSyncs } = require('./util/fetchLeaf')
const { expectRevert } = require('./util/assertions')

const BN = ethUtils.BN
const zeroAddress = '0x' + '0'.repeat(40)
const zeroHash = '0x' + '0'.repeat(64)
const zeroLeaf = getLeaf(0, zeroAddress, '0x')
const randomAddress = () => ethUtils.toChecksumAddress(randomHex(20))
const randomInRange = (x, y = 0) => Math.floor(Math.random() * (x - y) + y)
const randomGreaterThan = (x = 0) => Math.floor(Math.random() * x + x)
const randomBytes = () => randomHex(randomInRange(68))
const randomProof = (height) =>
  new Array(height).fill(0).map(() => randomHex(32))

const FUZZ_WEIGHT = process.env.CI == 'true' ? 128 : 20

contract('StateReceiver', async (accounts) => {
  describe('commitState()', async () => {
    let testStateReceiver
    let testCommitStateAddr

    before(async function () {
      testStateReceiver = await TestStateReceiver.deployed()
      await testStateReceiver.setSystemAddress(accounts[0])
      testCommitState = await TestCommitState.deployed()
      testCommitStateAddr = testCommitState.address
    })
    it('fail with a dummy record data', async () => {
      let recordBytes = 'dummy-data'
      recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
      try {
        const result = await testStateReceiver.commitState(0, recordBytes)
        assert.fail('Should not pass because of incorrect validator data')
      } catch (error) {
        assert(
          error.message.search('revert') >= 0,
          "Expected revert, got '" + error + "' instead"
        )
      }
    })
    it('commit the state #1 (stateID #1) and check id & data', async () => {
      const dummyAddr = '0x0000000000000000000000000000000000000000'
      const stateData = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256', 'uint256'],
        [dummyAddr, accounts[0], 0, 0]
      )
      let stateID = 1
      let recordBytes = [stateID, testCommitStateAddr, stateData]
      recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
      let result = await testStateReceiver.commitState.call(0, recordBytes)
      assert.isTrue(result)
      result = await testStateReceiver.commitState(0, recordBytes)
      const id = await testCommitState.id()
      const data = await testCommitState.data()
      assertBigNumberEquality(id, new BN(stateID))
      assert.strictEqual(data, stateData)

      // check for the StateCommitted event
      assert.strictEqual(result.logs[0].event, 'StateCommitted')
      assert.strictEqual(result.logs[0].args.stateId.toNumber(), stateID)
      assert.strictEqual(result.logs[0].args.success, true)

      assert.isNull(await testStateReceiver.failedStateSyncs(stateID))
    })

    it('commit the state #2 (stateID #2) and check id & data', async () => {
      const dummyAddr = '0x0000000000000000000000000000000000000001'
      const stateData = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256', 'uint256'],
        [dummyAddr, accounts[0], 0, 0]
      )
      let stateID = 2
      let recordBytes = [stateID, testCommitStateAddr, stateData]
      recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
      let result = await testStateReceiver.commitState.call(0, recordBytes)
      assert.isTrue(result)
      result = await testStateReceiver.commitState(0, recordBytes)
      const id = await testCommitState.id()
      const data = await testCommitState.data()
      assertBigNumberEquality(id, new BN(stateID))
      assert.strictEqual(data, stateData)

      assert.isNull(await testStateReceiver.failedStateSyncs(stateID))
    })

    it('should revert (calling from a non-system address', async () => {
      const dummyAddr = '0x0000000000000000000000000000000000000001'
      const stateData = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256', 'uint256'],
        [dummyAddr, accounts[0], 0, 0]
      )
      const stateID = 3
      let recordBytes = [stateID, testCommitStateAddr, stateData]
      recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
      try {
        await testStateReceiver.commitState(0, recordBytes, {
          from: accounts[1]
        })
        assert.fail('Non-System Address was able to commit state')
      } catch (error) {
        assert(
          error.message.search('Not System Addess!') >= 0,
          "Expected (Not System Addess), got '" + error + "' instead"
        )
      }
      assert.isNull(await testStateReceiver.failedStateSyncs(stateID))
    })

    it('Infinite loop: ', async () => {
      const stateData = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256', 'uint256'],
        // num iterations = 100000, will make the onStateReceive call go out of gas but not revert
        [testCommitStateAddr, accounts[0], 0, 100000]
      )
      const stateID = 3
      let recordBytes = [stateID, testCommitStateAddr, stateData]
      recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
      let result = await testStateReceiver.commitState.call(0, recordBytes)
      assert.isFalse(result)
      result = await testStateReceiver.commitState(0, recordBytes)
      assert.strictEqual(result.receipt.status, true)

      // check for the StateCommitted event with success === false
      assert.strictEqual(result.logs[0].event, 'StateCommitted')
      assert.strictEqual(result.logs[0].args.stateId.toNumber(), stateID)
      assert.strictEqual(result.logs[0].args.success, false)

      const failedStateSyncData = await testStateReceiver.failedStateSyncs(
        stateID
      )
      assert.strictEqual(
        failedStateSyncData,
        web3.eth.abi.encodeParameters(
          ['address', 'bytes'],
          [testCommitStateAddr, stateData]
        )
      )
    })
  })

  describe('replayFailedStateSync()', async () => {
    let testStateReceiver
    let testReenterer
    let testRevertingReceiver

    let revertingStateId

    before(async function () {
      testStateReceiver = await TestStateReceiver.deployed()
      await testStateReceiver.setSystemAddress(accounts[0])
      testCommitState = await TestCommitState.deployed()
      testCommitStateAddr = testCommitState.address
      testReenterer = await TestReenterer.deployed()
      testRevertingReceiver = await TestRevertingReceiver.deployed()
    })
    it('should commit failed state sync to mapping', async () => {
      const stateID = (await testStateReceiver.lastStateId()).toNumber() + 1
      const stateData = randomBytes()
      const recordBytes = ethUtils.bufferToHex(
        ethUtils.rlp.encode([stateID, testRevertingReceiver.address, stateData])
      )
      let res = await testStateReceiver.commitState.call(0, recordBytes)
      assert.isFalse(res)
      res = await testStateReceiver.commitState(0, recordBytes)

      assert.strictEqual(res.logs[0].args.success, false)
      assert.strictEqual(res.logs[0].args.stateId.toNumber(), stateID)
      assert.strictEqual(
        await testStateReceiver.failedStateSyncs(stateID),
        web3.eth.abi.encodeParameters(
          ['address', 'bytes'],
          [testRevertingReceiver.address, stateData]
        )
      )
      assert.strictEqual(
        (await testStateReceiver.lastStateId()).toNumber(),
        stateID
      )
      assert.isTrue(await testRevertingReceiver.shouldIRevert())
      revertingStateId = stateID
    })

    it('should revert on reverting replay', async () => {
      const stateID = revertingStateId
      assert.isTrue(await testRevertingReceiver.shouldIRevert())
      await expectRevert(
        testStateReceiver.replayFailedStateSync(stateID),
        'TestRevertingReceiver'
      )
    })

    it('should not block commit state flow', async () => {
      const stateID = revertingStateId
      assertBigNumberEquality(await testStateReceiver.lastStateId(), stateID)
      assert.isNotNull(await testStateReceiver.failedStateSyncs(stateID))
      await testRevertingReceiver.toggle()
      assert.isFalse(await testRevertingReceiver.shouldIRevert())

      const res = await testStateReceiver.commitState(
        0,
        ethUtils.bufferToHex(
          ethUtils.rlp.encode([
            stateID + 1,
            testRevertingReceiver.address,
            randomBytes()
          ])
        )
      )
      assert.strictEqual(res.logs[0].args.success, true)
      assert.isNull(await testStateReceiver.failedStateSyncs(stateID + 1))

      // reset contract for subsequent tests
      await testRevertingReceiver.toggle()
      assert.isTrue(await testRevertingReceiver.shouldIRevert())
    })

    it('should remove commit on successful replay', async () => {
      const stateID = revertingStateId
      await testRevertingReceiver.toggle()
      assert.isFalse(await testRevertingReceiver.shouldIRevert())
      const res = await testStateReceiver.replayFailedStateSync(stateID)

      assert.isNull(await testStateReceiver.failedStateSyncs(stateID))
      assert.strictEqual(res.logs[0].event, 'StateSyncReplay')
      assert.strictEqual(res.logs[0].args.stateId.toNumber(), stateID)

      await expectRevert(
        testStateReceiver.replayFailedStateSync(stateID),
        '!found'
      )
    })

    it('should not allow replay from receiver', async () => {
      const stateID = (await testStateReceiver.lastStateId()).toNumber() + 1
      const stateData = randomBytes()

      const recordBytes = ethUtils.bufferToHex(
        ethUtils.rlp.encode([stateID, testReenterer.address, stateData])
      )
      let res = await testStateReceiver.commitState.call(0, recordBytes)
      assert.isFalse(res)
      res = await testStateReceiver.commitState(0, recordBytes)

      assert.strictEqual(res.logs[0].event, 'StateCommitted')
      assert.strictEqual(res.logs[0].args.stateId.toNumber(), stateID)
      assert.strictEqual(res.logs[0].args.success, false)

      assert.strictEqual(
        await testStateReceiver.failedStateSyncs(stateID),
        web3.eth.abi.encodeParameters(
          ['address', 'bytes'],
          [testReenterer.address, stateData]
        )
      )

      await expectRevert(
        testStateReceiver.replayFailedStateSync(stateID),
        '!found'
      )
    })
  })

  describe('replayHistoricFailedStateSync()', async () => {
    let testStateReceiver
    let testRevertingReceiver

    let fromBlock, toBlock
    let tree
    let failedStateSyncs = []

    beforeEach(async function () {
      testStateReceiver = await TestStateReceiver.new(accounts[0])
      await testStateReceiver.setSystemAddress(accounts[0])
      testRevertingReceiver = await TestRevertingReceiver.new()

      await testRevertingReceiver.toggle()
      assert.isFalse(await testRevertingReceiver.shouldIRevert())

      // setup some failed state syncs before setting the root
      tree = new SparseMerkleTree(
        (await testStateReceiver.TREE_DEPTH()).toNumber()
      )
      failedStateSyncs = []

      fromBlock = await web3.eth.getBlockNumber()

      let stateId = (await testStateReceiver.lastStateId()).toNumber() + 1
      for (let i = 0; i < FUZZ_WEIGHT; i++) {
        const stateData = randomBytes()
        const recordBytes = ethUtils.bufferToHex(
          ethUtils.rlp.encode([
            stateId,
            testRevertingReceiver.address,
            stateData
          ])
        )

        assert.isFalse(await testRevertingReceiver.shouldIRevert())
        // every third state sync succeeds for variance
        if (i % 3 === 0) {
          const res = await testStateReceiver.commitState(0, recordBytes)
          assert.strictEqual(res.logs[0].args.success, true)
        } else {
          await testRevertingReceiver.toggle()
          const res = await testStateReceiver.commitState(0, recordBytes)
          await testRevertingReceiver.toggle()
          assert.strictEqual(res.logs[0].args.success, false)
          tree.add(getLeaf(stateId, testRevertingReceiver.address, stateData))
          failedStateSyncs.push([
            stateId,
            testRevertingReceiver.address,
            stateData
          ])
        }
        stateId++
      }

      // set the rootAndClaimCount
      await testStateReceiver.setRootAndLeafCount(
        tree.getRoot(),
        tree.leafCount
      )
      assert.equal(failedStateSyncs.length, tree.leafCount)

      toBlock = await web3.eth.getBlockNumber()
    })
    it('only rootSetter can set root & leaf count, only once', async () => {
      assert.equal(await testStateReceiver.rootSetter(), accounts[0])
      await expectRevert(
        testStateReceiver.setRootAndLeafCount(tree.getRoot(), tree.leafCount, {
          from: accounts[1]
        }),
        '!rootSetter'
      )
      await expectRevert(
        testStateReceiver.setRootAndLeafCount(tree.getRoot(), tree.leafCount),
        '!zero'
      )
    })
    it('should not replay zero leaf or invalid proof', async () => {
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          randomProof(tree.height),
          tree.leafCount + 1,
          // zero leaf
          0,
          zeroAddress,
          '0x'
        ),
        'used'
      )
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          randomProof(tree.height),
          randomInRange(tree.leafCount),
          randomHex(32),
          randomAddress(),
          randomHex(80)
        ),
        '!proof'
      )

      const leadIdx = randomInRange(tree.leafCount)
      const [stateId, receiver, stateData] = failedStateSyncs[leadIdx]
      const leaf = getLeaf(stateId, receiver, stateData)

      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          tree.getProofTreeByValue(leaf),
          (leadIdx + 1) % (1 << tree.height), // random leaf index
          stateId,
          receiver,
          stateData
        ),
        '!proof'
      )
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          tree.getProofTreeByValue(leaf),
          leadIdx,
          randomHex(32),
          receiver,
          stateData
        ),
        '!proof'
      )
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          tree.getProofTreeByValue(leaf),
          leadIdx,
          stateId,
          randomAddress(),
          stateData
        ),
        '!proof'
      )
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          tree.getProofTreeByValue(leaf),
          leadIdx,
          stateId,
          receiver,
          randomHex(80) // different from 68 const used
        ),
        '!proof'
      )
    })
    it('should replay all failed state syncs', async () => {
      const shuffledFailedStateSyncs = failedStateSyncs
        .map((x, i) => [i, x]) // preserve index
        .sort(() => Math.random() - 0.5) // shuffle
      let replayed = 0

      for (const [
        leafIndex,
        [stateId, receiver, stateData]
      ] of shuffledFailedStateSyncs) {
        const leaf = getLeaf(stateId, receiver, stateData)
        assert.isFalse(await testStateReceiver.nullifier(leaf))
        const proof = tree.getProofTreeByValue(leaf)
        const res = await testStateReceiver.replayHistoricFailedStateSync(
          proof,
          leafIndex,
          stateId,
          receiver,
          stateData
        )
        assert.strictEqual(res.logs[0].event, 'StateSyncReplay')
        assert.strictEqual(res.logs[0].args.stateId.toNumber(), stateId)
        assert.strictEqual(
          (await testStateReceiver.replayCount()).toNumber(),
          ++replayed
        )
        assert.isTrue(await testStateReceiver.nullifier(leaf))

        await expectRevert(
          testStateReceiver.replayHistoricFailedStateSync(
            proof,
            leafIndex,
            stateId,
            receiver,
            stateData
          ),
          replayed == failedStateSyncs.length ? 'end' : 'used'
        )
      }

      // should not allow replaying again
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          randomProof(tree.height),
          randomInRange(tree.leafCount),
          randomHex(32),
          randomAddress(),
          randomHex(68)
        ),
        'end'
      )
    })
    it('should not replay nullified state sync', async () => {
      const idx = randomInRange(tree.leafCount)
      const [stateId, receiver, stateData] = failedStateSyncs[idx]
      const leaf = getLeaf(stateId, receiver, stateData)
      const proof = tree.getProofTreeByValue(leaf)

      assert.isFalse(await testStateReceiver.nullifier(leaf))

      const res = await testStateReceiver.replayHistoricFailedStateSync(
        proof,
        idx,
        stateId,
        receiver,
        stateData
      )
      assert.strictEqual(res.logs[0].event, 'StateSyncReplay')
      assert.strictEqual(res.logs[0].args.stateId.toNumber(), stateId)

      assert.isTrue(await testStateReceiver.nullifier(leaf))

      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          proof,
          idx,
          stateId,
          receiver,
          stateData
        ),
        'used'
      )
    })
    it('should be able to fetch failed state syncs from logs', async () => {
      const logs = await fetchFailedStateSyncs(
        web3.currentProvider,
        fromBlock,
        testStateReceiver.address,
        toBlock - fromBlock
      )
      assert.strictEqual(logs.length, failedStateSyncs.length)
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        const [stateId] = failedStateSyncs[i]
        assert.strictEqual(
          log.topics[0],
          keccak256('StateCommitted(uint256,bool)')
        )
        assert.strictEqual(BigInt(log.topics[1]).toString(), stateId.toString())
        assert.strictEqual(log.data, '0x' + '0'.repeat(64))
      }
    })
    it('should revert if value of leaf index is out of bounds', async () => {
      const invalidLeafIndex = randomGreaterThan(2 ** (await testStateReceiver.TREE_DEPTH()).toNumber());
      await expectRevert(
        testStateReceiver.replayHistoricFailedStateSync(
          randomProof(tree.height),
          invalidLeafIndex,
          randomHex(32),
          randomAddress(),
          randomHex(68)
        ),
        'invalid leafIndex'
      )
    })
  })
})

function assertBigNumberEquality(num1, num2) {
  if (!BN.isBN(num1)) num1 = web3.utils.toBN(num1.toString())
  if (!BN.isBN(num2)) num2 = web3.utils.toBN(num2.toString())
  assert(
    num1.eq(num2),
    `expected ${num1.toString(10)} and ${num2.toString(10)} to be equal`
  )
}
