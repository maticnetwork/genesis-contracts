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

# Generate genesis
$ node generate-genesis.js
```

It will generate `genesis.json` file from `genesis-template.json` file.
