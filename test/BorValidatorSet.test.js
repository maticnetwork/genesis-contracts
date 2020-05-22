const ethUtils = require('ethereumjs-util')
const crypto = require('crypto')

const TestBorValidatorSet = artifacts.require('TestBorValidatorSet')
const BN = ethUtils.BN

contract('BorValidatorSet', async (accounts) => {
    describe('Initial values', async () => {
        let testBVS

        before(async function () {
            testBVS = await TestBorValidatorSet.deployed()
        })
        it('span for 0th block be 0', async () => {
            const span = await testBVS.getSpanByBlock(0)
            assertBigNumberEquality(span, new BN(0))
        })
        it('Validator set be default', async () => {
            const validators = await testBVS.getBorValidators(255)
            assert.strictEqual(validators[0][0], "0x6c468CF8c9879006E22EC4029696E005C2319C9D") // check address in validators.js
            assertBigNumberEquality(validators[1], new BN(40))   // check power
        })
        it('Default validator stake', async () => {
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(0)
            assertBigNumberEquality(validatorTotalStake, new BN(0))
        })
    })
    describe('commitSpan()', async () => {
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
        it('committing span #1', async () => {
            let nextSpan = await testBVS.getSpanByBlock(333)
            assertBigNumberEquality(nextSpan, new BN(0))
            const validators = new Array(30)
            for (let i = 0; i < 30; i++) {
                validators[i] = getRandomValidator()
                totalStake += validators[i].power
            }
            this.producers = validators.slice(0, 20)
            const validatorBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(validators))
            const producerBytes = ethUtils.bufferToHex(ethUtils.rlp.encode(this.producers))
            await testBVS.commitSpan(
                new BN(1),
                new BN(256),
                new BN(511),
                validatorBytes,
                producerBytes,
                { from: accounts[0], gas: 13000000 }
            )
            nextSpan = await testBVS.getSpanByBlock(333)
            assertBigNumberEquality(nextSpan, new BN(1))
            nextSpan = await testBVS.getSpanByBlock(500)
            assertBigNumberEquality(nextSpan, new BN(1))
        })
        it('Producer set for span #1', async () => {
            const producers = await testBVS.getBorValidators(500)
            for (let i = 0; i < this.producers.length; i++) {
                assert.strictEqual(producers[0][i], this.producers[i][2])
                assertBigNumberEquality(producers[1][i], this.producers[i][1])
            }
        })
        it('Total staking power for the validators for span #1', async () => {
            const validatorTotalStake = await testBVS.getValidatorsTotalStakeBySpan(432)
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

function getRandomValidator() {
    return [
        getRandomInt(), // id
        getRandomInt(), // power
        web3.utils.toChecksumAddress('0x' + crypto.randomBytes(20).toString('hex')) // signer
    ]
}

function getRandomInt() {
    return Math.floor(Math.random() * 100)
}

function printSpan(span) {
    console.log({
        number: span.number.toString(),
        startBlock: span.startBlock.toString(),
        endBlock: span.endBlock.toString()
    })
}
