var Config = require('../lib/config/config.js');
var Deploy = require('../lib/deploy.js');
var Compiler = require('../lib/compiler.js');
var ChainManager = require('../lib/chain_manager.js');
var assert = require('assert');
var web3 = require('web3');

// TODO: replace with ethersim
var web3 = require('web3');
web3.setProvider(new web3.providers.HttpProvider("http://localhost:8101"));

setDeployConfig = function(config) {
  var _blockchainConfig = (new Config.Blockchain()).loadConfigFile(config.blockchain);
  var blockchainConfig = _blockchainConfig.config("development");
  var compiler = new Compiler(_blockchainConfig);
  var contractsConfig = new Config.Contracts(blockchainConfig, compiler);
  return (new ChainManager()).loadConfig({}).init('development', {}, web3)
  .then(function(chainManager) {
    contractsConfig.loadConfigFile(config.contracts);
    contractsConfig.init(config.files, 'development');
    compiler.init('development');
    return new Deploy('development', config.files, blockchainConfig, contractsConfig, chainManager);
  });
}

describe('embark.deploy', function() {

  describe('contracts as arguments to other contracts', function() {
    var files = [
      'test/support/contracts/wallet.sol',
      'test/support/contracts/simple_storage.sol',
      'test/support/contracts/another_storage.sol',
      'test/support/contracts/wallets.sol'
    ];

    describe('#deploy_contracts', function() {
      it("should deploy contracts", function() {

        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/arguments.yml'
        })
        .then(function(deploy) {
          return deploy.deploy_contracts("development");
        })
        .then(function(deploy) {

          var all_contracts = ['Wallet', 'SimpleStorage', 'AnotherStorage', 'Wallets'];
          for(var i=0; i < all_contracts.length; i++) {
            var className = all_contracts[i];

            assert.equal(deploy.deployedContracts.hasOwnProperty(className), true);
          }
        });
      });
    });

    describe('#generate_abi_file', function() {
      it("should deploy contracts", function() {

        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/arguments.yml'
        })
        .then(function(deploy) {
          deploy.deployedContracts = {
            "SimpleStorage": "0x123",
            "AnotherStorage": "0x234"
          }
          deploy.contractDB = {
            "SimpleStorage":  {compiled: {info: {abiDefinition: 123}}},
            "AnotherStorage": {compiled: {info: {abiDefinition: 234}}}
          }

          var result = deploy.generate_abi_file();
          assert.equal(result, "web3.setProvider(new web3.providers.HttpProvider('http://localhost:8101'));web3.eth.defaultAccount = web3.eth.accounts[0];SimpleStorageAbi = 123;SimpleStorageContract = web3.eth.contract(SimpleStorageAbi);SimpleStorage = SimpleStorageContract.at('0x123');AnotherStorageAbi = 234;AnotherStorageContract = web3.eth.contract(AnotherStorageAbi);AnotherStorage = AnotherStorageContract.at('0x234');");
        });
      });
    });
  });

  describe('contracts as arguments to other contracts with stubs', function() {
    var files = [
      'test/support/contracts/crowdsale.sol',
      'test/support/contracts/token.sol'
    ];

    describe('#deploy_contracts', function() {

      it("should deploy contracts", function() {
        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/arguments2.yml'
        })
        .then(function(deploy) {
          return deploy.deploy_contracts("development");
        }).then(function(deploy) {

          var all_contracts = ['token', 'Crowdsale'];
          for(var i=0; i < all_contracts.length; i++) {
            var className = all_contracts[i];

            assert.equal(deploy.deployedContracts.hasOwnProperty(className), true);
          }
        });
      });
    });
  });

  describe('contracts instances', function() {
    var files = [
      'test/support/contracts/simple_storage.sol'
    ];

    describe('#deploy_contracts', function() {

      it("should deploy contracts", function() {

        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/instances.yml'
        }).then(function(deploy) {
          return deploy.deploy_contracts("development");
        }).then(function(deploy) {

          var all_contracts = ['BarStorage', 'FooStorage'];
          for(var i=0; i < all_contracts.length; i++) {
            var className = all_contracts[i];

            assert.equal(deploy.deployedContracts.hasOwnProperty(className), true);
          }
          assert.notEqual(deploy.deployedContracts.hasOwnProperty('SimpleStorage'), true);
        });
      });
    });
  });

  describe('contracts deploy script', function() {
    var files = [
      'test/support/contracts/data_source.sol',
      'test/support/contracts/manager.sol'
    ];

    describe('#deploy_contracts', function() {

      it("should deploy contracts", function() {
        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/arguments3.yml'
        })
        .then(function(deploy) {
          return deploy.deploy_contracts("development");
        }).then(function(deploy) {

          var all_contracts = ['DataSource', 'MyDataSource', 'Manager'];
          for(var i=0; i < all_contracts.length; i++) {
            var className = all_contracts[i];

            assert.equal(deploy.deployedContracts.hasOwnProperty(className), true);
          }
        });
      });

      it("should execute deploy changes", function() {
        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/arguments.yml'
        })
        .then(function(deploy) {
          return deploy.deploy_contracts("development");
        })
        .then(function(deploy) {

          web3.setProvider(new web3.providers.HttpProvider('http://localhost:8101'));
          web3.eth.defaultAccount = web3.eth.accounts[0];

          data_source_abi     = deploy.contractDB['DataSource'].compiled.info.abiDefinition;
          data_source_address = deploy.deployedContracts['DataSource'];
          my_data_source_abi     = deploy.contractDB['MyDataSource'].compiled.info.abiDefinition;
          my_data_source_address = deploy.deployedContracts['MyDataSource'];
          manager_abi     = deploy.contractDB['Manager'].compiled.info.abiDefinition;
          manager_address = deploy.deployedContracts['Manager'];

          DataSource = web3.eth.contract(data_source_abi).at(data_source_address);
          MyDataSource = web3.eth.contract(my_data_source_abi).at(my_data_source_address);
          ManagerSource = web3.eth.contract(manager_abi).at(manager_address);

          assert.equal(DataSource.storeData().toNumber(), 5);
          assert.equal(Manager.data().toString(), my_data_source_address);
        });
      });
    });
  });

  describe('contracts with addresses defined', function() {
    var files = [
      'test/support/contracts/simple_storage.sol'
    ];

    describe('#deploy_contracts', function() {

      it("should not deploy contracts with addresses defined", function() {
        setDeployConfig({
          files: files,
          blockchain: 'test/support/blockchain.yml',
          contracts: 'test/support/address.yml'
        })
        .then(function(deploy) {
          return deploy.deploy_contracts("development");
        })
        .then(function(deploy) {
          var expected_deploys = ['SimpleStorage', 'BarStorage', 'FooStorage'];

          for(var i=0; i < expected_deploys.length; i++) {
            var className = expected_deploys[i];
            assert.equal(deploy.deployedContracts.hasOwnProperty(className), true);
          }

          assert.equal(deploy.deployedContracts['SimpleStorage'], '0x123');
          assert.equal(deploy.deployedContracts['BarStorage'], '0x234');
        });
      });
    });
  });
});
