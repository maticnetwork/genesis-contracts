const bluebird = require('bluebird')

const BorValidatorSet = artifacts.require('BorValidatorSet')
const TestBorValidatorSet = artifacts.require('TestBorValidatorSet')
const BytesLib = artifacts.require('BytesLib')
const ECVerify = artifacts.require('ECVerify')
const IterableMapping = artifacts.require('IterableMapping')
const RLPReader = artifacts.require('RLPReader')
const SafeMath = artifacts.require('SafeMath')
const StateReciever = artifacts.require('StateReceiver')
const TestStateReceiver = artifacts.require('TestStateReceiver')
const TestCommitState = artifacts.require('TestCommitState')
const System = artifacts.require('System')
const ValidatorVerifier = artifacts.require('ValidatorVerifier')

const libDeps = [
    {
        lib: BytesLib,
        contracts: [BorValidatorSet, TestBorValidatorSet]
    },
    {
        lib: ECVerify,
        contracts: [BorValidatorSet, TestBorValidatorSet]
    },
    {
        lib: IterableMapping,
        contracts: [StateReciever, TestStateReceiver]
    },
    {
        lib: RLPReader,
        contracts: [BorValidatorSet, TestBorValidatorSet, StateReciever, TestStateReceiver]
    },
    {
        lib: SafeMath,
        contracts: [BorValidatorSet, TestBorValidatorSet, StateReciever, TestStateReceiver]
    }
]

module.exports = async function (deployer, network) {
    deployer.then(async () => {
        console.log('linking libs...')
        await bluebird.map(libDeps, async e => {
            await deployer.deploy(e.lib)
            deployer.link(e.lib, e.contracts)
        })

        console.log("Deploying contracts...")
        await Promise.all([
            deployer.deploy(BorValidatorSet),
            deployer.deploy(TestBorValidatorSet),
            deployer.deploy(StateReciever),
            deployer.deploy(TestStateReceiver),
            deployer.deploy(System),
            deployer.deploy(ValidatorVerifier),
            deployer.deploy(TestCommitState)
        ])
    })
}
