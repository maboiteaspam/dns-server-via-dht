
var pathExtra = require('path-extra');
var nativeDns = require('native-dns');
var dnsDHT = require('dns-via-dht');
var util = require('util');
var underscore = require('underscore');
var bitauth = require('bitauth');
var fs = require('fs');
var ConfigHelper = require('dns-via-dht-config');


var DHTDNSServer = function(opts){

  var debug = require('debug')('dns-server-via-dht');

  var configPath = opts.configPath || pathExtra.homedir()+"/.dhtdns";
  var configHolder = new ConfigHelper(configPath);

  var pendingQuestions = {
    /* dns:timeout() */
  };

  var status = 'stopped';
  var dnsServer;
  var solver = new dnsDHT(opts);


  this.getConfig = function(refresh){
    return configHolder.getConfig(refresh);
  };
  this.addAnnounce = function(dns, passphrase){
    return configHolder.addAnnounce(dns, passphrase);
  };
  this.getAnnouncePublicKey = function(dns){
    return configHolder.getAnnouncePublicKey(dns);
  };
  this.addPeer = function(dns, publicKey){
    return configHolder.addPeer(dns, publicKey);
  };
  this.editPeer = function(dns, publicKey){
    return configHolder.editPeer(dns, publicKey);
  };
  this.remove = function(dns){
    return configHolder.remove(dns);
  };


  this.reload = function(oldConfig, newConfig){

    if(status !=='started' ) return false;

    debug('reloading');

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
    debug('announcing %s', dns, passphrase);
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

    var announceToDHT = function(){
      var config = configHolder.getConfig();
      Object.keys(config.announced).forEach(function(dns){
        var passphrase = config.announced[dns];
        that.announce(dns, passphrase);
      });

      Object.keys(config.peersDNS).forEach(function(dns){
        var publicKey = config.peersDNS[dns];
        that.resolve(dns, publicKey, function(err, success){
          debug('err %s', err);
          debug('success %s', success);
        });
      });
    };

    var startupDnsServer = function (){

      debug('DNS Server : %s %s', opts.dnsPort, opts.dnsHostname);
      dnsServer = nativeDns.createServer();

      // handle incoming DNS query on the server
      var onDNSQuery = function(request, response){

        var config = configHolder.getConfig();
        var question = request.question[0].name;
        var publicKey = config.peersDNS[question];

        var resolvePeerDNS = function(response){
          debug('request %s %s', question, publicKey);
          if(!pendingQuestions[question]) {
            pendingQuestions[question] = setTimeout(function(){
              debug('timed out');
              delete pendingQuestions[question];
              response.send();
            }, 5000);
          }
          solver.resolve(question, publicKey, function(err, found){
            clearTimeout(pendingQuestions[question]);
            debug('send response');
            if(err){
              debug('err %s', err);
            } else if(pendingQuestions[question]/* timeout is alive */) {
              response.answer.push(nativeDns.A({
                name: question,
                address: found.ip,
                ttl: 600
              }));
            }
            response.send();
            delete pendingQuestions[question];
          });
        };
        var resolveLocalDNS = function(response){
          debug('no peer found for %s', question);
          var privateKey = config.announced[question];
          var publicKey = bitauth.getPublicKeyFromPrivateKey(privateKey);
          debug('found announce %s %s', question, publicKey);
          debug('send response');
          response.answer.push(nativeDns.A({
            name: question,
            address: '127.0.0.1',
            ttl: 600
          }));
          response.send();
          delete pendingQuestions[question];
        };

        if(publicKey) {
          resolvePeerDNS(response);
        } else if( config.announced[question] ) {
          resolveLocalDNS(response);
        } else {
          debug('no announce found for %s', question);
        }
      };

      dnsServer.on('request', onDNSQuery);

      dnsServer.on('error', function (err, buff, req, res) {
        debug('err %s', err);
        debug('stack %s', err.stack);
        console.error('unhandled error')
        console.error(err.stack)
        console.error(err)
      });
      dnsServer.serve(opts.dnsPort, opts.dnsHostname);

    };

    solver.start(function(){

      announceToDHT();
      startupDnsServer();

      configHolder.watch(function(oldConfig, newConfig){
        if(status !=='started' ) return false;
        that.reload(oldConfig, newConfig);
      });

      status = 'started';

      if( then ) then();

    });
  };

  this.stop = function(then){

    if(status !=='started' ) return then(false);
    status = 'stopped';

    debug('stopping');

    configHolder.release();
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
