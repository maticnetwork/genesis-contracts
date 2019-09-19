# genesis-contracts

#### Setup genesis

Setup genesis whenever contracts get changed

```
$ npm install
$ npm run truffle:compile
```

#### Change contracts

```
$ npm install
$ npm run truffle:compile
$ node generate-genesis.js
```

It will generate `genesis.json` file from `genesis-template.json` file.
