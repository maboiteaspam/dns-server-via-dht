
var pathExtra = require('path-extra');
var nativeDns = require('native-dns');
var dnsDHT = require('dns-via-dht');
var util = require('util');
var underscore = require('underscore');
var bitauth = require('bitauth');
var hashjs = require('hash.js');
var fs = require('fs');


var DHTDNSServer = function(opts){

  var debug = require('debug')('dns-server-via-dht');
  var status = 'stopped';
  var configPath = opts.configPath || pathExtra.homedir()+"/.dhtdns";
  var defaultConfig = {
    announced:{
      /*dns: passphrase|privateKey*/
    },
    peersDNS:{
      /*dns: publicKey*/
    }
  };
  var configWatcher;
  var pendingQuestions = {
    /* dns:timeout() */
  };

  var server = nativeDns.createServer();
  var solver = new dnsDHT(opts);

  server.on('request', function (request, response) {
    var question = request.question[0].name;
    var publicKey = config.peersDNS[question];
    if(publicKey) {
      pendingQuestions[question] = setTimeout(function(){
        delete pendingQuestions[question];
        response.send();
      }, 5000);
      solver.resolve(dns, publicKey, function(err, response){
        clearTimeout(pendingQuestions[question]);
        if(err){
          response.send();
        } else if(pendingQuestions[question]/* timeout is alive */) {
          response.answer.push(dns.A({
            name: question,
            address: response.ip,
            ttl: 600
          }));
          response.send();
        }
        delete pendingQuestions[question];
      });
    }
  });

  server.on('error', function (err, buff, req, res) {
    console.log(err.stack);
    console.log(buff);
    console.log(req);
    console.log(res);
    throw 'unhandled !!!';
  });

  var saveConfig = function(config){
    debug('%s', configPath);
    debug('%s', JSON.stringify(config));
    fs.writeFile(configPath, JSON.stringify(config));
    return true;
  };
  var readConfig = function(){
    if( fs.existsSync(configPath) ) {
      return JSON.parse(fs.readFileSync(configPath) );
    }
    return defaultConfig;
  };

  var userConfig;
  this.getConfig = function(){
    if( !userConfig ) {
      userConfig = readConfig();
    }
    return userConfig;
  };
  this.addAnnounce = function(dns, passphrase){
    var config = this.getConfig();
    if(!config.announced[dns] && !config.peersDNS[dns]){
      config.announced[dns] = (new hashjs.sha256())
        .update(passphrase + bitauth.generateSin().priv)
        .digest('hex');
      debug('%s %s', dns, config.announced[dns]);
      return saveConfig(config);
    }
    return false;
  };
  this.addPeer = function(dns, publicKey){
    var config = this.getConfig();
    if(!config.announced[dns] && !config.peersDNS[dns]){
      config.peersDNS[dns] = publicKey;
      debug('%s %s', dns, config.peersDNS[dns]);
      return saveConfig(config);
    }
    return false;
  };
  this.remove = function(dns){
    var config = this.getConfig();
    delete config.announced[dns];
    delete config.peersDNS[dns];
    return saveConfig(config);
  };


  this.reload = function(oldConfig){

    if(status !=='started' ) return false;

    var newConfig = this.getConfig();
    var removed = underscore.diff(Object.keys(oldConfig),
      Object.keys(newConfig));
    var added = underscore.diff(Object.keys(oldConfig),
      Object.keys(newConfig));

    var that = this;
    if(removed.length){
      this.stop(function(){
        that.start();
      });
    }else{
      added.forEach(function(dns){
        that.announce(dns, newConfig[dns]);
      });
    }
  };

  this.announce = function(dns, passphrase){
    return solver.announce(dns, passphrase);
  };

  this.resolve = function(dns, publicKey, then){
    return solver.resolve(dns, publicKey, then);
  };

  this.start = function(then){

    if(status !=='stopped' ) then(false);

    var that = this;
    var config = this.getConfig();
    solver.start(function(){

      Object.keys(config.announced).forEach(function(dns){
        var passphrase = config.announced[dns];
        that.announce(dns, passphrase);
      });

      Object.keys(config.peersDNS).forEach(function(dns){
        var publicKey = config.peersDNS[dns];
        that.resolve(dns, publicKey, function(err, success){
          if(err) console.error(err);
          if(success) console.log('Resolved ' + dns);
          if(!success) console.error('Not resolved ' + dns);
        });
      });

      server.serve(opts.dnsPort, opts.dnsHostname);

      var options = {persistent: false, interval: 1000};
      fs.watchFile(configPath, options, function() {
        if(status !=='started' ) return false;
        that.reload(config);
      });

      status = 'started';

      if( then ) then();

    });
  };

  this.stop = function(then){

    if(status !=='started' ) then(false);
    status = 'stopped';

    fs.unwatchFile(configPath);
    configWatcher = null;
    server.close();
    solver.stop(then);
  };
};

module.exports = DHTDNSServer;
