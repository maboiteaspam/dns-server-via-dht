
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

  var dnsServer;
  var solver = new dnsDHT(opts);


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
  this.getConfig = function(refresh){
    if( !userConfig || refresh ) {
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
      debug('dns=%s publicKey=%s', dns, bitauth.getPublicKeyFromPrivateKey(config.announced[dns]));
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

    debug('reloading');

    var newConfig = this.getConfig(true);
    var removed = underscore.omit(oldConfig.announced, Object.keys(newConfig.announced));
    var added = underscore.omit(newConfig.announced, Object.keys(oldConfig.announced));

    debug('removed DNS found %s', JSON.stringify(removed));
    debug('added DNS found %s', JSON.stringify(added));

    var that = this;
    if(Object.keys(removed).length){
      this.stop(function(){
        process.nextTick(function(){
          that.start(function(){
            debug('reload done');
          });
        })
      });
    }else if(Object.keys(added).length){
      Object.keys(added).forEach(function(dns){
        debug('reload announce %s', dns);
        that.announce(dns, newConfig[dns]);
      });
    } else {
      debug('oldConfig %s', JSON.stringify(oldConfig) );
      debug('newConfig %s', JSON.stringify(newConfig) );
      debug('nothing todo')
    }
  };

  this.announce = function(dns, passphrase){
    debug('announcing %s', dns);
    return solver.announce(dns, passphrase);
  };

  this.resolve = function(dns, publicKey, then){
    return solver.resolve(dns, publicKey, function(err, response){
      debug('resolved %s %s', response.dns, response.ip);
      debug('err is %s', response.err);
      if(then) then(err,response);
    });
  };

  this.start = function(then){

    if(status !=='stopped' ) return then(false);

    debug('starting');

    var that = this;
    var config = this.getConfig(true);
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

      debug('DNS %s %s', opts.dnsPort, opts.dnsHostname);

      dnsServer = nativeDns.createServer();
      dnsServer.on('request', function (request, response) {
        var config = that.getConfig(true);
        var question = request.question[0].name;
        var publicKey = config.peersDNS[question];
        if(publicKey) {
          debug('request %s %s', question, publicKey);
          pendingQuestions[question] = setTimeout(function(){
            debug('timed out');
            delete pendingQuestions[question];
            response.send();
          }, 5000);
          solver.resolve(question, publicKey, function(err, response){
            clearTimeout(pendingQuestions[question]);
            debug('send response');
            if(err){
              debug('err %s', err);
              response.send();
            } else if(pendingQuestions[question]/* timeout is alive */) {
              response.answer.push(nativeDns.A({
                name: question,
                address: response.ip,
                ttl: 600
              }));
              response.send();
            }
            delete pendingQuestions[question];
          });
        } else {
          debug('no peer found for %s', question);
          var privateKey = config.announced[question];
          if( privateKey ){
            var publicKey = bitauth.getPublicKeyFromPrivateKey(privateKey);
            debug('found announce %s %s', question, publicKey);
            debug('send response');
            response.answer.push(nativeDns.A({
              name: question,
              address: '127.0.0.1',
              ttl: 600
            }));
            response.send();
          } else {
            debug('no announce found for %s', question);
            response.send();
          }
        }
      });

      dnsServer.on('error', function (err, buff, req, res) {
        console.log(err.stack);
        console.log(buff);
        console.log(req);
        console.log(res);
        throw 'unhandled !!!';
      });
      dnsServer.serve(opts.dnsPort, opts.dnsHostname);

      var options = {persistent: false, interval: 1000};
      fs.watchFile(configPath, options, function() {
        if(status !=='started' ) return false;
        that.reload(that.getConfig());
      });

      status = 'started';

      if( then ) then();

    });
  };

  this.stop = function(then){

    if(status !=='started' ) return then(false);
    status = 'stopped';

    debug('stopping');

    fs.unwatchFile(configPath);
    configWatcher = null;
    dnsServer.close();
    solver.stop(then);
  };


  this.getDhtAddress = function(){
    return solver.getDhtAddress();
  };
  this.getDhtStatus = function(){
    return solver.getDhtStatus();
  };

  this.getDnsAddress = function(){
    return opts.dnsHostname +':' + opts.dnsPort;
  };
  this.getDnsStatus = function(){
    return {};
  };


};

module.exports = DHTDNSServer;
