const { assert } = require('chai')
const ethUtils = require('ethereumjs-util')
const TestStateReceiver = artifacts.require('TestStateReceiver')
const TestCommitState = artifacts.require('TestCommitState')
const TestReenterer = artifacts.require('TestReenterer')
const TestRevertingReceiver = artifacts.require('TestRevertingReceiver')

const BN = ethUtils.BN

contract('StateReceiver', async accounts => {
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
      const stateData = '0x'
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
      try {
        await testStateReceiver.replayFailedStateSync(stateID)
        assert.fail('reverting receiver was able replay')
      } catch (err) {
        assert(
          err.message.search('TestRevertingReceiver') >= 0,
          "Expected 'TestRevertingReceiver', got" + err + "' instead"
        )
      }
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
            '0x'
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

      try {
        await testStateReceiver.replayFailedStateSync(stateID)
        assert.fail('was able to replay again')
      } catch (err) {
        assert(
          err.message.search('!found') >= 0,
          "Expected '!found', got" + err + "' instead"
        )
      }
    })

    it('should not allow replay from receiver', async () => {
      const stateID = (await testStateReceiver.lastStateId()).toNumber() + 1
      const stateData = '0x'

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

      try {
        await testStateReceiver.replayFailedStateSync(stateID)
        assert.fail('was able to replay again')
      } catch (err) {
        assert(
          err.message.search('!found') >= 0,
          "Expected '!found', got" + err + "' instead"
        )
      }
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
