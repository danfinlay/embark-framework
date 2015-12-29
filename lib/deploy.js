var web3 = require('web3');
var fs = require('fs');
var grunt = require('grunt');
var readYaml = require('read-yaml');
var Promise = require('bluebird');
var Config = require('./config/config.js');

Deploy = function(env, contractFiles, blockchainConfig, contractsConfig, chainManager, withProvider, withChain, _web3) {
  var self = this;
  if (_web3 !== undefined) {
    web3 = _web3;
  }
  this.contractsManager = contractsConfig;
  this.contractsConfig = this.contractsManager.config(env);
  this.deployedContracts = {};
  this.blockchainConfig = blockchainConfig;

  try {
    if (withProvider) {
      web3.setProvider(new web3.providers.HttpProvider("http://" + this.blockchainConfig.rpcHost + ":" + this.blockchainConfig.rpcPort));
    }
    primaryAddress = web3.eth.coinbase;
    web3.eth.defaultAccount = primaryAddress;
  } catch (e) {
    throw new Error("==== can't connect to " + this.blockchainConfig.rpcHost + ":" + this.blockchainConfig.rpcPort + " check if an ethereum node is running");
  }

  this.chainManager = chainManager;
  chainManager.init(env, this.blockchainConfig, web3)
  .then(function() {
    self.withChain = withChain;
    console.log("primary account address is : " + primaryAddress);
    return self;
  })
  .catch(function(reason) {
    throw new Error("==== failed to initialize chain manager");
  });
};

Deploy.prototype.deploy_contract = function(contractObject, contractParams, cb) {
  var callback = function(e, contract) {
    if(!e && contract.address !== undefined) {
      cb(contract.address);
    }
    else {
      console.log("error deploying");
      exit();
    }
  };

  contractParams.push(callback);

  contractObject["new"].apply(contractObject, contractParams);
}

Deploy.prototype.deploy_contracts = function(env) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.contractsManager.compileContracts(env);
    var all_contracts = self.contractsManager.all_contracts;
    self.contractDB = self.contractsManager.contractDB;
    self.deployedContracts = {};

    return self.deploy_contract_list(env, all_contracts);
  })
  .then(function(contracts) {
    return self;
  });
}

Deploy.prototype.deploy_contract_list = function(env, all_contracts) {
  var self = this;

  return Promise.all(all_contracts.map(function(className) {
    return self.deploy_a_contract(env, className);
  }))
  .then(function(contracts) {
    return self;
  });
}

Deploy.prototype.deploy_a_contract = function(env, className) {
  var self = this;
  return new Promise(function(resolve, reject) {

    var contractDependencies = self.contractsManager.contractDependencies;
    var contract = self.contractDB[className];

    if (contract.deploy === false) {
      console.log("skipping " + className);
      resolve(self);
      return
    }

    var realArgs = [];
    for (var l = 0; l < contract.args.length; l++) {
      arg = contract.args[l];
      if (arg[0] === "$") {
        realArgs.push(self.deployedContracts[arg.substr(1)]);
      } else {
        realArgs.push(arg);
      }
    }

    if (contract.address !== undefined) {
      self.deployedContracts[className] = contract.address;

      console.log("contract " + className + " at " + contract.address);
      resolve(contract);

    } else {
      var chainContract = self.chainManager.getContract(className, contract.compiled.code, realArgs);

      if (chainContract != undefined && web3.eth.getCode(chainContract.address) !== "0x") {
        console.log("contract " + className + " is unchanged and already deployed at " + chainContract.address);
        self.deployedContracts[className] = chainContract.address;
        self.execute_cmds(contract.onDeploy);
        resolve(chainContract);

      } else {
        contractObject = web3.eth.contract(contract.compiled.info.abiDefinition);

        contractParams = realArgs.slice();
        contractParams.push({
          from: primaryAddress,
          data: contract.compiled.code,
          gas: contract.gasLimit,
          gasPrice: contract.gasPrice
        });

        console.log('trying to obtain ' + className + ' address...');

        self.deploy_contract(contractObject, contractParams, function(contractAddress) {
          if (web3.eth.getCode(contractAddress) === "0x") {
            console.log("=========");
            console.log("contract was deployed at " + contractAddress + " but doesn't seem to be working");
            console.log("try adjusting your gas values");
            console.log("=========");
          } else {
            console.log("deployed " + className + " at " + contractAddress);
            self.chainManager.addContract(className, contract.compiled.code, realArgs, contractAddress);
            if (self.withChain) {
              self.chainManager.save();
            }
          }

          self.deployedContracts[className] = contractAddress;

          self.execute_cmds(contract.onDeploy);

          resolve(this);
        });
      }
    }
  })
};

Deploy.prototype.execute_cmds = function(cmds) {
  if (cmds == undefined || cmds.length === 0) return;

  eval(this.generate_abi_file());
  for (var i = 0; i < cmds.length; i++) {
    var cmd = cmds[i];

    for(className in this.deployedContracts) {
      var contractAddress = this.deployedContracts[className];

      var re = new RegExp("\\$" + className, 'g');
      cmd = cmd.replace(re, '"' + contractAddress + '"');
    }

    console.log("executing: " + cmd);
    eval(cmd);
  }
}

Deploy.prototype.generate_provider_file = function() {
  var result = "";
  result = "web3.setProvider(new web3.providers.HttpProvider('http://" + this.blockchainConfig.rpcHost + ":" + this.blockchainConfig.rpcPort + "'));";
  result += "web3.eth.defaultAccount = web3.eth.accounts[0];";

  return result;
}

Deploy.prototype.generate_abi_file = function() {
  var result = this.generate_provider_file();

  for(className in this.deployedContracts) {
    var deployedContract = this.deployedContracts[className];
    var contract = this.contractDB[className];

    var abi = JSON.stringify(contract.compiled.info.abiDefinition);
    var contractAddress = deployedContract;

    console.log('address is ' + contractAddress);

    result += className + "Abi = " + abi + ";";
    result += className + "Contract = web3.eth.contract(" + className + "Abi);";
    result += className + " = " + className + "Contract.at('" + contractAddress + "');";
  }

  return result;
};

Deploy.prototype.generate_and_write_abi_file = function(destFile) {
  var result = this.generate_abi_file();
  grunt.file.write(destFile, result);
};

module.exports = Deploy;
