
var bitauth = require('bitauth');
var hashjs = require('hash.js');
var fs = require('fs');
var underscore = require('underscore');


var Config = function(configPath){

  var debug = require('debug')('dns-server-via-dht');

  debug('configPath %s', configPath);


  var config;
  var defaultConfig = {
    announced:{
      /*dns: passphrase|privateKey*/
    },
    peersDNS:{
      /*dns: publicKey*/
    }
  };

  var saveConfig = function(){
    debug('configPath %s', configPath);
    debug('config %s', JSON.stringify(config));
    fs.writeFile(configPath, JSON.stringify(config));
    return true;
  };
  var readConfig = function(){
    if( fs.existsSync(configPath) ) {
      return JSON.parse(fs.readFileSync(configPath) );
    }
    return defaultConfig;
  };

  this.getConfig = function(refresh){
    if( !config || refresh ) {
      config = readConfig();
    }
    return config;
  };
  this.addAnnounce = function(dns, passphrase){
    if(!config.announced[dns] && !config.peersDNS[dns]){
      config.announced[dns] = (new hashjs.sha256())
        .update(passphrase + bitauth.generateSin().priv)
        .digest('hex');
      debug('dns=%s publicKey %s', dns, bitauth.getPublicKeyFromPrivateKey(config.announced[dns]));
      return saveConfig();
    }
    return false;
  };
  this.addPeer = function(dns, publicKey){
    if(!config.announced[dns] && !config.peersDNS[dns]){
      config.peersDNS[dns] = publicKey;
      debug('%s %s', dns, config.peersDNS[dns]);
      return saveConfig();
    }
    return false;
  };
  this.editPeer = function(dns, publicKey){
    if(config.peersDNS[dns]){
      config.peersDNS[dns] = publicKey;
      debug('%s %s', dns, config.peersDNS[dns]);
      return saveConfig();
    }
    return false;
  };
  this.remove = function(dns){
    delete config.announced[dns];
    delete config.peersDNS[dns];
    return saveConfig();
  };
  this.watch = function(then){
    var that = this;
    var options = {persistent: false, interval: 1000};
    fs.watchFile(configPath, options, function() {
      var oldConfig = underscore.clone(config);
      var newConfig = that.getConfig(true);
      if( then ) {
        then(oldConfig, newConfig);
      }
    });
  };
  this.release = function(){
    fs.unwatchFile(configPath);
  };

  // initialize
  this.getConfig();
};

module.exports = Config;
