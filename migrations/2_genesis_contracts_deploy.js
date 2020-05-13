const bluebird = require('bluebird')

const BorValidatorSet = artifacts.require('BorValidatorSet')
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
        contracts: [BorValidatorSet]
    },
    {
        lib: ECVerify,
        contracts: [BorValidatorSet]
    },
    {
        lib: IterableMapping,
        contracts: [StateReciever]
    },
    {
        lib: RLPReader,
        contracts: [BorValidatorSet, StateReciever]
    },
    {
        lib: SafeMath,
        contracts: [BorValidatorSet, StateReciever]
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
        await deployer.deploy(StateReciever)
        await deployer.deploy(System)
        await deployer.deploy(ValidatorVerifier)
    })
}
