const ethUtils = require('ethereumjs-util')
const TestStateReceiver = artifacts.require('TestStateReceiver')
const TestCommitState = artifacts.require('TestCommitState')
const BN = ethUtils.BN

contract('StateReceiver', async (accounts) => {
    describe('commitState()', async () => {
        let testStateReceiver
        let testCommitStateAddr

        before(async function () {
            testStateReceiver = await TestStateReceiver.deployed()
            testStateReceiver.setSystemAddress(accounts[0])
            testCommitState = await TestCommitState.deployed()
            testCommitStateAddr = testCommitState.address
        })
        it('fail with a dummy record data', async () => {
            let recordBytes = "dummy-data"
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            try {
                const result = await testStateReceiver.commitState(0,recordBytes)
                assert.fail("Should not pass because of incorrect validator data")
            } catch (error) {
                assert(error.message.search('revert') >= 0, "Expected revert, got '" + error + "' instead")
            }
        })
        it('commit the state #1 (stateID #1) and check id & data', async () => {
            const dummyAddr = "0x0000000000000000000000000000000000000000"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  [dummyAddr, accounts[0], 0, 0])
            let stateID = 1
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            let result = await testStateReceiver.commitState.call(0,recordBytes)
            assert.isTrue(result)
            result = await testStateReceiver.commitState(0,recordBytes)
            const id = await testCommitState.id()
            const data = await testCommitState.data()
            assertBigNumberEquality(id, new BN(stateID))
            assert.strictEqual(data, stateData)
        })
        it('commit the state #2 (stateID #2) and check id & data', async () => {
            const dummyAddr = "0x0000000000000000000000000000000000000001"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  [dummyAddr, accounts[0], 0, 0])
            let stateID = 2
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            let result = await testStateReceiver.commitState.call(0,recordBytes)
            assert.isTrue(result)
            result = await testStateReceiver.commitState(0,recordBytes)
            const id = await testCommitState.id()
            const data = await testCommitState.data()
            assertBigNumberEquality(id, new BN(stateID))
            assert.strictEqual(data, stateData)
        })
        it('should revert (calling from a non-system address', async () => {
            const dummyAddr = "0x0000000000000000000000000000000000000001"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  [dummyAddr, accounts[0], 0, 0])
            const stateID = 3
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
                try {
                    await testStateReceiver.commitState(0,recordBytes,
                        {from: accounts[1]})
                    assert.fail("Non-System Address was able to commit state")
                } catch (error) {
                    assert(error.message.search('Not System Addess!') >= 0, "Expected (Not System Addess), got '" + error + "' instead")
                }
        })
        it('Infinite loop: ', async () => {
            const dummyAddr = "0x0000000000000000000000000000000000000001"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  // num iterations = 10000, will make the onStateReceive call go out of gas but not revert
                  [dummyAddr, accounts[0], 0, 10000])
            const stateID = 3
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            const result = await testStateReceiver.commitState.call(0,recordBytes)
            assert.isFalse(result)
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
