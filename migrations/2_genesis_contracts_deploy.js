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
const TestReenterer = artifacts.require('TestReenterer')
const TestRevertingReceiver = artifacts.require('TestRevertingReceiver')
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
        for (let e of libDeps) {
            await deployer.deploy(e.lib)
            deployer.link(e.lib, e.contracts)
        }

        console.log("Deploying contracts...")
        await deployer.deploy(BorValidatorSet)
        await deployer.deploy(TestBorValidatorSet)
        await deployer.deploy(StateReciever)
        await deployer.deploy(TestStateReceiver)
        await deployer.deploy(System)
        await deployer.deploy(ValidatorVerifier)
        await deployer.deploy(TestCommitState)
        await deployer.deploy(TestReenterer)
        await deployer.deploy(TestRevertingReceiver)
    })
}
