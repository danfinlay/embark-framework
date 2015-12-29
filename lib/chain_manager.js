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
    self.chainManagerConfig = obj;
    return self;
  })
  .catch(function (e) {
    console.dir(e);
    console.warn("error reading " + filename + "; defaulting to empty set");
  })
};

ChainManager.prototype.loadConfig = function(config) {
  this.chainManagerConfig = config;
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

      if (self.chainManagerConfig[chainId] === undefined) {
        self.chainManagerConfig[chainId] = {contracts: {}};
      }

      self.currentChain = self.chainManagerConfig[chainId];
      resolve(self);
    });
  });
}

ChainManager.prototype.addContract = function(contractName, code, args, address) {
  this.currentChain.contracts[sha3_256(code + contractName + args.join(','))] = {
    name: contractName,
    address: address
  }
}

ChainManager.prototype.getContract = function(contractName, code, args) {
  return this.currentChain.contracts[sha3_256(code + contractName + args.join(','))];
}

ChainManager.prototype.save = function() {
  fs.writeFileSync(this.file, JSON.stringify(this.chainManagerConfig));
}

module.exports = ChainManager;
