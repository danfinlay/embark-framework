var ChainManager = require('../lib/chain_manager.js');
var Config = require('../lib/config/config.js');
var Blockchain = require('../lib/blockchain.js');
var assert = require('assert');
var fs = require('fs');

// TODO: replace with ethersim
var web3 = require('web3');
web3.setProvider(new web3.providers.HttpProvider("http://localhost:8101"));

describe('embark.chain_manager', function() {
  var chainFile = './test/support/chain_manager.json';

  var blockchainConfig = (new Config.Blockchain()).loadConfigFile('test/support/blockchain.yml').config('development');

  describe('#init', function() {
    it('should initialize chain', function() {

      (new ChainManager()).loadConfigFile(chainFile)
      .then(function(chainManager) {
        chainManager.init('development', blockchainConfig, web3)
        .then(function() {
          var blockHash = '0x70fe139444c1b6000184d663715ab48d51f04fe5bf2db3260d982ca38c30806f8669c995141cdebe8e4411afe6b1a91024b0b6fc7561ca16d7c187507f75fcae';
          var chain = chainManager.chainManagerConfig[blockHash]
          assert.ok(chain);
        })
        .catch(function(error) {
          assert.ifError(error);
        });
      });
    });
  });

  describe('#addContract', function() {
    it('should register a contract in the chain', function() {

      var chainManager = new ChainManager();
      chainManager.loadConfigFile(chainFile)
      .then(function(chainManager) {
        return chainManager.init('development', blockchainConfig, web3)
      }).then(function(chainManager) {

        chainManager.addContract("Foo", "123456", [], "0x123");

        var chain = chainManager.chainManagerConfig['0x70fe139444c1b6000184d663715ab48d51f04fe5bf2db3260d982ca38c30806f8669c995141cdebe8e4411afe6b1a91024b0b6fc7561ca16d7c187507f75fcae'];
        var contract = chain.contracts["d5d91a8825c5c253dff531ddda2354c4014f5699b7bcbea70207cfdcb37b6c8b"]

        assert.equal(contract['name'], "Foo");
        assert.equal(contract['address'], "0x123");
      });
    });
  });

  describe('#getContract', function() {

    it('should get a contract in the chain', function() {

      (new ChainManager()).loadConfigFile(chainFile)
      .then(function(chainManager) {
        return chainManager.init('development', chainManager.config, web3)
      }).then(function(chainManager) {
        return chainManager.init('development', blockchainConfig, web3)
      }).then(function(chainManager) {

        chainManager.addContract("Foo", "123456", [], "0x123");
        var contract = chainManager.getContract("Foo", "123456", []);

        assert.equal(contract.name, "Foo");
        assert.equal(contract.address, "0x123");
      });
    });
  });

  describe('#save', function() {

    it('should save changes in the chain', function() {

      (new ChainManager()).loadConfigFile(chainFile)
      .then(function(chainManager) {
        return chainManager.init('development', chainManager.config, web3)
      }).then(function(chainManager) {

        chainManager.addContract("Foo", "123456", [], "0x123");
        chainManager.save();

        var chainFile = './test/support/chain_manager.json';
        var content = fs.readFileSync(chainFile).toString();
        var json = JSON.parse(content);
        var blockHash = "0x70fe139444c1b6000184d663715ab48d51f04fe5bf2db3260d982ca38c30806f8669c995141cdebe8e4411afe6b1a91024b0b6fc7561ca16d7c187507f75fcae";
        var contractAddress = 'd5d91a8825c5c253dff531ddda2354c4014f5699b7bcbea70207cfdcb37b6c8b';

        assert.ok(blockHash in json);
        var contract = json[blockHash]['contracts'][contractAddress]
        assert.equal(contract.name, 'Foo');
        assert.equal(contract.address, '0x123');
      });
    });
  });
});
