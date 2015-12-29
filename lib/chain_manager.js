var fs = require('fs');
var sha3_256 = require('js-sha3').sha3_256;
var Promise = require('bluebird');
var readFile = Promise.promisify(fs.readFile);

ChainManager = function() {
  this.chainManagerConfig = {};
  this.currentChain = {};
  this.file = "";
}

ChainManager.prototype.loadConfigFile = function(filename) {
  var self = this;
  this.file = filename;
  return readFile(filename)
  .then(function(file) {
    var obj = JSON.parse(file);
    self.loadConfig(obj);
    return self;
  })
  .catch(function (e) {
    console.dir(e);
    console.warn("error reading " + filename + "; defaulting to empty set");
  })
};

ChainManager.prototype.loadConfig = function(config) {
  this.chainManagerConfig = config || {};
  return this;
};

ChainManager.prototype.init = function(env, config, web3) {
  var self = this;

  return new Promise(function(resolve, reject) {
    web3.eth.getBlock(0, function (err, block) {
      if (err || !block) {
        reject(new Error("Cannot get the genesis block, is embark blockchain running ?"));
      }

      var chainId = block.hash;

      if (!('chainManagerConfig' in self)) {
        self.chainManagerConfig = {};
      }

      if (self.chainManagerConfig[chainId] === undefined) {
        self.chainManagerConfig[chainId] = block;
      }

      self.currentChain = self.chainManagerConfig[chainId];
      resolve(self);
    });
  });
}

ChainManager.prototype.hashComponents = function (name, code, args) {
  return sha3_256(code + name + args.join(','));
}

ChainManager.prototype.addContract = function(contractName, code, args, address) {
  if (!('contracts' in this.currentChain)) {
    this.currentChain.contracts = {};
  }
  var hash = this.hashComponents(contractName, code, args);
  this.currentChain.contracts[hash] = {
    name: contractName,
    address: address
  }
}

ChainManager.prototype.getContract = function(contractName, code, args) {
  var hash = this.hashComponents(contractName, code, args);
  return this.currentChain.contracts[hash];
}

ChainManager.prototype.save = function() {
  fs.writeFileSync(this.file, JSON.stringify(this.chainManagerConfig));
}

module.exports = ChainManager;
