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
  fs.writeFileSync(chainFile, '{"gas_limit": 500000}');

  var blockchainConfig = (new Config.Blockchain()).loadConfigFile('test/support/blockchain.yml').config('development');

  describe('#init', function() {
    it('should initialize chain', function() {

      (new ChainManager()).loadConfigFile(chainFile)
      .then(function(chainManager) {

        chainManager.init('development', blockchainConfig, web3)
        .then(function() {
          var chain = chainManager.chainManagerConfig['0xcd9c11da1e46f86ce40a38b6ef84cfdfa6ea92598a27538f0e87da6d7a5c73d5']
          assert.notEqual(chain, undefined);
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

        chainManager.addContract("Foo", "123456", [], "0x123");

        var chain = chainManager.chainManagerConfig['0xcd9c11da1e46f86ce40a38b6ef84cfdfa6ea92598a27538f0e87da6d7a5c73d5']
        var contract = chain.contracts["d5d91a8825c5c253dff531ddda2354c4014f5699b7bcbea70207cfdcb37b6c8b"]

        assert.equal(contract.name, "Foo");
        assert.equal(contract.address, "0x123");
      });
    });
  });

  describe('#getContract', function() {

    it('should a contract in the chain', function() {

      (new ChainManager()).loadConfigFile(chainFile)
      .then(function(chainManager) {

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

        chainManager.save();

        var chainFile = './test/support/chain_manager.json';
        var content = fs.readFileSync(chainFile).toString();
        assert.equal(content, '{"0xcd9c11da1e46f86ce40a38b6ef84cfdfa6ea92598a27538f0e87da6d7a5c73d5":{"contracts":{"d5d91a8825c5c253dff531ddda2354c4014f5699b7bcbea70207cfdcb37b6c8b\":{"name":"Foo","address":"0x123"}}}}');
      });
    });
  });
});
