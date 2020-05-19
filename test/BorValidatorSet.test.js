const ethUtils = require('ethereumjs-util')
const BorValidatorSet = artifacts.require('BorValidatorSet')
const TestBorValidatorSet = artifacts.require('TestBorValidatorSet')
const BN = ethUtils.BN

// import * as contracts from './artifacts'

contract('BorValidatorSet', async (accounts) => {
    describe('Initial values', async () => {
        let borValidatorSetInstance
        let testBVS

        before(async function () {
            borValidatorSetInstance = await BorValidatorSet.deployed()
            testBVS = await TestBorValidatorSet.deployed()
        })

        it('check current span be 0', async () => {
            const currentSpan = await testBVS.getCurrentSpan()
            assertBigNumberEquality(currentSpan.number, new BN(0))
        })
        it('check current sprint be 0', async () => {
            const currentSprint = await testBVS.currentSprint()
            assertBigNumberEquality(currentSprint, new BN(0))
        })
        it('span for 0th block be 0', async () => {
            const span = await testBVS.getSpanByBlock(0)
            assertBigNumberEquality(span, new BN(0))
        })
        it('Validator set be default', async () => {
            const validators = await testBVS.getValidators()
            assert(validators[0], '0x6c468CF8c9879006E22EC4029696E005C2319C9D') // check address
            assertBigNumberEquality(validators[1], new BN(40))   // check power
        })
        it('Default validator stake', async () => {
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(0)
            assertBigNumberEquality(validatorTotalStake, new BN(0))
        })
    })

    describe('\n commitSpan() \n', async () => {
        let borValidatorSetInstance
        let testBVS
        let totalStake = 0

        before(async function () {
            borValidatorSetInstance = await BorValidatorSet.deployed()
            testBVS = await TestBorValidatorSet.deployed()
            testBVS.setSystemAddress(accounts[0])
        })

        it('should revert because of incorrect validator data', async () => {
            let validators = "dummy-data"
            const validatorBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(validators))
            let currentSpan = await testBVS.getCurrentSpan()
            try {
                await (testBVS.commitSpan(
                    currentSpan.number + 1,
                    currentSpan.endBlock + 1,
                    currentSpan.endBlock + 256,
                    validatorBytes,
                    validatorBytes,
                    { from: accounts[0] }
                ))
                assert.fail("Should not pass because of incorrect validator data")
            } catch (error) {
                assert(error.message.search('revert') >= 0, "Expected revert, got '" + error + "' instead")
            }
        })

        it('span #0', async () => {
            let validators = [[1, 1, accounts[0]],
            [2, 1, accounts[1]]]
            let producer = [[1, 1, accounts[0]]]

            const validatorBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(validators))
            const producerBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(producer))
            let currentSpan = await testBVS.getCurrentSpan()
            await testBVS.commitSpan(
                currentSpan.number.add(new BN(1)),
                currentSpan.endBlock.add(new BN(1)),
                currentSpan.endBlock.add(new BN(256)),
                validatorBytes,
                producerBytes,
                { from: accounts[0] }
            )
            // current assert span to be 0
            const currentSpanNumber = await testBVS.currentSpanNumber()
            assertBigNumberEquality(currentSpan.number, new BN(0))
        })

        it('span #1', async () => {
            let validators = [[0, 2, accounts[0]],
            [1, 1, accounts[1]]]
            let producer = [[0, 2, accounts[0]]]

            totalStake += 3 //  2 + 1 
            const validatorBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(validators))
            const producerBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(producer))
            let currentSpan = await testBVS.getCurrentSpan()
            await testBVS.commitSpan(
                currentSpan.number.add(new BN(1)),
                currentSpan.endBlock.add(new BN(1)),
                currentSpan.endBlock.add( new BN(256)),
                validatorBytes,
                producerBytes,
                { from: accounts[0] }
            )
            // current assert span to be 1
            const currentSpanNumber = await testBVS.currentSpanNumber()
            assertBigNumberEquality(currentSpan.number, new BN(1))
        })

        it('Validator set for span #1', async () => {
            const currentSpan = await testBVS.getCurrentSpan()
            const validators = await testBVS.getBorValidators(currentSpan.startBlock)
            assert(validators, accounts[0])
        })

        it('Total staking power for the validators after the span #1', async () => {
            const currentSpanNumber = await testBVS.currentSpanNumber()
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(currentSpanNumber)
            assertBigNumberEquality(validatorTotalStake, new BN(totalStake))
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
