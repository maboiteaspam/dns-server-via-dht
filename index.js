
var pathExtra = require('path-extra');
var debug = require('debug')('dns-server-via-dht');
var dns = require('dns');
var dnsDHT = require('dns-via-dht');
var util = require('util');
var underscore = require('underscore');
var bitauth = require('bitauth');
var hashjs = require('hash.js');
var fs = require('fs');


var DHTDNSServer = function(opts){

  var status = 'stopped';
  var configPath = opts.configPath || pathExtra.homedir()+"/.dhtdns";
  var config = {
    announced:{
      /*dns: passphrase|privateKey*/
    },
    addressBook:{
      /*dns: publicKey*/
    }
  };
  var configWatcher;
  var pendingQuestions = {
    /* dns:timeout() */
  };

  var server = dns.createServer();
  var solver = new dnsDHT(opts);

  server.on('request', function (request, response) {
    var question = request.question[0].name;
    var publicKey = config.addressBook[question];
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

  var saveConfig = function(){
    return !!fs.writeFileSync(configPath, JSON.stringify(config));
  };

  this.getConfig = function(){
    if( fs.existsSync(configPath) ) {
      return JSON.parse(fs.readFileSync(configPath) );
    }
    return config;
  };
  this.announce = function(dns, passphrase){
    if(!config.announced[dns]){
      config.announced[dns] = (new hashjs.sha256())
        .update(passphrase + bitauth.generateSin().priv)
        .digest('hex');
      return saveConfig();
    }
    return false;
  };

  this.reload = function(){

    if(status !=='started' ) return false;

    var newConfig = this.getConfig();
    var removed = underscore.diff(Object.keys(config),
      Object.keys(newConfig));
    var added = underscore.diff(Object.keys(config),
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

  this.start = function(then){

    if(status !=='stopped' ) then(false);

    var that = this;
    var fileConfig = this.getConfig();
    if(!fileConfig){
      saveConfig();
    } else {
      config = fileConfig;
    }
    solver.start(function(){

      Object.keys(config.announced).forEach(function(dns){
        var passphrase = config.announced[dns];
        solver.announce(dns, passphrase);
      });

      server.serve(opts.dnsPort, opts.dnsHostname);

      var options = {persistent: false, interval: 1000};
      fs.watchFile(configPath, options, function() {
        if(status !=='started' ) return false;
        that.reload();
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
