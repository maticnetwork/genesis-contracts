const bluebird = require('bluebird')

const BorValidatorSet = artifacts.require('BorValidatorSet')
const TestBorValidatorSet = artifacts.require('TestBorValidatorSet')
const BytesLib = artifacts.require('BytesLib')
const ECVerify = artifacts.require('ECVerify')
const IterableMapping = artifacts.require('IterableMapping')
const RLPReader = artifacts.require('RLPReader')
const SafeMath = artifacts.require('SafeMath')
const StateReciever = artifacts.require('StateReceiver')
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
        contracts: [StateReciever]
    },
    {
        lib: RLPReader,
        contracts: [BorValidatorSet, TestBorValidatorSet, StateReciever]
    },
    {
        lib: SafeMath,
        contracts: [BorValidatorSet, TestBorValidatorSet, StateReciever]
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
        await deployer.deploy(BorValidatorSet)
        await deployer.deploy(TestBorValidatorSet)
        await deployer.deploy(StateReciever)
        await deployer.deploy(System)
        await deployer.deploy(ValidatorVerifier)
    })
}
