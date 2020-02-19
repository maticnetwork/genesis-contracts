# genesis-contracts

#### Setup genesis

Setup genesis whenever contracts get changed

```bash
$ npm install
$ npm run truffle:compile
```

#### Generate genesis file

```bash
$ git submodule init
$ git submodule update
$ cd matic-contracts
$ npm install
$ node scripts/process-templates.js --bor-chain-id <bor-chain-id>
$ npm run truffle:compile
```

Following command will generate `BorValidatorSet.sol` file from `BorValidatorSet.template` file.

```bash
# Generate bor validator set using stake and balance
# Modify validators.json before as per your need
$ node generate-borvalidatorset.js --bor-chain-id <bor-chain-id> --heimdall-chain-id <heimdall-chain-id>
```

Following command will generate `genesis.json` file from `genesis-template.json` file.

```bash
# Generate genesis file
$ node generate-genesis.js --bor-chain-id <bor-chain-id> --heimdall-chain-id <heimdall-chain-id>
```
