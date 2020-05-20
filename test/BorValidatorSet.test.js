const ethUtils = require('ethereumjs-util')
const TestBorValidatorSet = artifacts.require('TestBorValidatorSet')
const BN = ethUtils.BN

contract('BorValidatorSet', async (accounts) => {
    describe('Initial values', async () => {
        let testBVS

        before(async function () {
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
            assert.strictEqual(validators[0][0], "0x6c468CF8c9879006E22EC4029696E005C2319C9D") // check address
            assertBigNumberEquality(validators[1], new BN(40))   // check power
        })
        it('Default validator stake', async () => {
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(0)
            assertBigNumberEquality(validatorTotalStake, new BN(0))
        })
    })

    describe('\n commitSpan() \n', async () => {
        let testBVS
        let totalStake = 0

        before(async function () {
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
            let currentSpan = await testBVS.getCurrentSpan()
            console.log("----------------- for span 0 ------------------")
            console.log(currentSpan)
            let validators = await testBVS.getBorValidators(currentSpan.startBlock)
            console.log("-------------------- validators ------------------")
            console.log(validators)
            validators = [[1, 1, accounts[0]],
            [2, 1, accounts[1]]]
            let producer = [[1, 1, accounts[0]]]

            const validatorBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(validators))
            const producerBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(producer))
            await testBVS.commitSpan(
                currentSpan.number.add(new BN(1)),
                currentSpan.endBlock.add(new BN(1)),
                currentSpan.endBlock.add(new BN(256)),
                validatorBytes,
                producerBytes,
                { from: accounts[0] }
            )
            // assert next span to be 1
            const nextSpan = await testBVS.getNextSpan()
            assertBigNumberEquality(nextSpan.number, new BN(1))
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
            // assert span to be 2
            const nextSpan = await testBVS.getNextSpan()
            assertBigNumberEquality(nextSpan.number, new BN(2))
        })

        it('Validator set for span #1', async () => {
            const currentSpan = await testBVS.getCurrentSpan()
            console.log("--------------------- for span 1 ------------------")
            console.log(currentSpan)
            const validators = await testBVS.getBorValidators(currentSpan.startBlock)
            console.log("-------------------- validators ------------------")
            console.log(validators)
            assert.strictEqual(validators[0][0], accounts[0])
        })
        it('Validator set for span #2', async () => {
            const nextSpan = await testBVS.getNextSpan()
            console.log("--------------------- for span 2 ------------------")
            console.log(nextSpan)
            const validators = await testBVS.getBorValidators(nextSpan.startBlock)
            console.log("-------------------- validators ------------------")
            console.log(validators)
            assert.strictEqual(validators[0][0], accounts[0])
        })

        it('Total staking power for the validators for span #2', async () => {
            const nextSpan = await testBVS.getNextSpan()
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(nextSpan.number)
            console.log("------------------validator total stake for span #"+nextSpan.number+"--------------------")
            console.log(validatorTotalStake)
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
