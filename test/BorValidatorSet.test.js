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
            assert(currentSpan, new BN(0))
        })
        it('check current sprint be 0', async () => {
            const currentSprint = await testBVS.currentSprint()
            assert(currentSprint, new BN(0))
        })
        it('span for 0th block be 0', async () => {
            const span = await testBVS.getSpanByBlock(0)
            assert(span, new BN(0))
        })
        it('0th Span proposal be false', async () => {
            const proposal = await testBVS.spanProposalPending()
            assert.isFalse(proposal)
        })
        it('Validator set be null', async () => {
            const validators = await testBVS.getValidators()
            assert(validators[0], '0x6c468CF8c9879006E22EC4029696E005C2319C9D')
            assert(validators[1], new BN(10))
        })
    })

    describe('\n commitSpan() \n', async () => {
        let borValidatorSetInstance
        let testBVS

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

        it('should pass', async () => {
            // (0) 0x9fB29AAc15b9A4B7F17c3385939b007540f4d791
            // (1) 0x96C42C56fdb78294F96B0cFa33c92bed7D75F96a 
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
            // current assert span to be 2
            assert(testBVS.currentSpanNumber(), new BN(2))
        })

        it('should pass again', async () => {
            let validators = [[1, 1, accounts[0]],
            [2, 1, accounts[1]]]
            let producer = [[1, 1, accounts[0]]]

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
            // current assert span to be 3
            assert(testBVS.currentSpanNumber(), new BN(3))
        })

        it('3rd Span proposal be true', async () => {
            await testBVS.proposeSpan()
            const proposal = await testBVS.spanProposalPending()
            assert.isTrue(proposal)
        })

        it('Validator set for span #3', async () => {
            const validators = await testBVS.getBorValidators(256)
            assert(validators, accounts[0])
        })
    })
})
