# genesis-contracts

#### Setup genesis

Setup genesis whenever contracts get changed
### 1. Install dependencies and submodules
```bash
$ npm install
$ git submodule init
$ git submodule update
```

### 2. Compile Matic contracts
```bash
$ cd matic-contracts
$ npm install
$ node scripts/process-templates.js --bor-chain-id <bor-chain-id>
$ npm run truffle:compile
$ cd ..
```

### 3. Compile contracts
```bash
$ npm run truffle:compile
```

### 4. Generate genesis file

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

### 5. Run Tests
```bash
$ npm run testrpc
$ npm test
```
