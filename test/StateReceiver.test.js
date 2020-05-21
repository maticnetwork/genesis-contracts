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
        it('commit the state (stateID #1) and check id & data', async () => {
            // .decode(data, (address, address, uint256, uint256));
            // depositTokens(rootToken, user, amountOrTokenId, depositId);
            const dummyAddr = "0x0000000000000000000000000000000000000000"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  [dummyAddr, accounts[0], 0, 0])
            const stateID =1
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            const result = await testStateReceiver.commitState(0,recordBytes)

            const id = await testCommitState.id()
            const data = await testCommitState.data()
            assertBigNumberEquality(id, new BN(stateID))
            assert.strictEqual(data, stateData)
        })
        it('commit the state (stateID #2) and check id & data', async () => {
            // .decode(data, (address, address, uint256, uint256));
            // depositTokens(rootToken, user, amountOrTokenId, depositId);
            const dummyAddr = "0x0000000000000000000000000000000000000001"
            const stateData = web3.eth.abi.encodeParameters(
                  ['address', 'address', 'uint256', 'uint256'],
                  [dummyAddr, accounts[1], 0, 0])
            const stateID =2
            let recordBytes = [stateID, testCommitStateAddr, stateData]
            recordBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(recordBytes))
            const result = await testStateReceiver.commitState(0,recordBytes)

            const id = await testCommitState.id()
            const data = await testCommitState.data()
            assertBigNumberEquality(id, new BN(stateID))
            assert.strictEqual(data, stateData)
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
  