#!/usr/bin/env node

var program = require('commander');
var bitauth = require('bitauth');
var spawn = require('child_process').spawn;
var DHTDNSServer = require('./index.js');

var pkg = require('./package.json');

// Configure CLI

program
  .version(pkg.version);

program
  .option('-v, --verbose',
  'enable verbosity');

program.command('start')
  .description('Start DNS server')

  .option('-dnsp, --dns-port <port>',
  'port on which the DNS listens')
  .option('-dnsh, --dns-hostname <hostname>',
  'hostname on which DNS listens')

  .option('-dhtp, --dht-port <port>',
  'port on which the DHT listens')
  .option('-dhth, --dht-hostname <hostname>',
  'hostname on which DHT listens')

  .option('-K, --knodes <K>',
  'K nodes to find before he DHT is ready')
  .option('-b, --bootstrap <nodes>',
  'ip:port address of the bootstrap nodes, or, \'diy\' to scan the network for the BT DHT')

  .option('-d, --detach',
  'Detach process')

  .action(function(command){
    var opts = {
      port: parseInt(command.port) || 9090,
      dnsPort: parseInt(command.dnsPort) || 9080,
      hostname: command.hostname || '0.0.0.0',
      dnsHostname: command.dnsHostname || '0.0.0.0'
    };

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }
    var debug = require('debug')('dns-server-via-dht');

    if (command.knodes) {
      opts.K = program.knodes;
    }

    if (command.bootstrap === '') {
      opts.bootstrap = false;
    } else if (command.bootstrap) {
      opts.bootstrap = command.bootstrap;
    }


    var startProgram = function(){
      debug('%s', JSON.stringify(opts) );
      var server = new DHTDNSServer(opts);
      console.log('Starting server');
      server.start(function(){
        console.log('Server ready');
      });
    };

    if(command.detach) {
      var cmdLine = [];
      process.argv.forEach(function (val) {
        if(!val.match(/^(-d|--detach)$/) ) cmdLine.push(val);
      });
      var detachedProcess = spawn(cmdLine.shift(), cmdLine,
      {detached: true, stdio:'inherit' });
      detachedProcess.unref();
    } else {
      startProgram();
    }
  });

program.command('resolve <dns> <publicKey>')
  .description('Resolve a peer DNS')

  .option('-dnsp, --dns-port <port>',
  'port on which the DNS listens')
  .option('-dnsh, --dns-hostname <hostname>',
  'hostname on which DNS listens')

  .option('-dhtp, --dht-port <port>',
  'port on which the DHT listens')
  .option('-dhth, --dht-hostname <hostname>',
  'hostname on which DHT listens')

  .option('-K, --knodes <K>',
  'K nodes to find before he DHT is ready')
  .option('-b, --bootstrap <nodes>',
  'ip:port address of the bootstrap nodes, or, \'diy\' to scan the network for the BT DHT')

  .action(function(dns, publicKey, command){
    var opts = {
      port: parseInt(command.port) || 9090,
      dnsPort: parseInt(command.dnsPort) || 9080,
      hostname: command.hostname || '0.0.0.0',
      dnsHostname: command.dnsHostname || '0.0.0.0'
    };

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }
    var debug = require('debug')('dns-server-via-dht');

    if (command.knodes) {
      opts.K = program.knodes;
    }

    if (command.bootstrap === '') {
      opts.bootstrap = false;
    } else if (command.bootstrap) {
      opts.bootstrap = command.bootstrap;
    }

    debug('%s', JSON.stringify(opts) );
    var server = new DHTDNSServer(opts);
    console.log('Starting server');
    server.start(function(){
      console.log('Server ready');
      server.resolve(dns, publicKey, function(){
        console.log('Resolved done');
        console.log(arguments);
      })
    });

  });


program.command('announce <dns> <passphrase>')
  .description('Announce a DNS')
  .action(function(dns, passphrase){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }
    var debug = require('debug')('dns-server-via-dht');

    debug('%s', JSON.stringify(opts) );

    var server = new DHTDNSServer(opts);

    if(server.addAnnounce(dns, passphrase) ){
      console.log('done')
    } else {
      console.log('failed')
    }

  });

program.command('show <dns>')
  .description('Show passphrase & public key of a dns')
  .action(function(dns){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }
    var debug = require('debug')('dns-server-via-dht');

    var server = new DHTDNSServer(opts);

    var config = server.getConfig();

    if(config.announced[dns]){
      var privateKey = config.announced[dns];
      console.log('type : announced DNS');
      console.log('passphrase : '+privateKey);
      console.log('public Key : '+bitauth.getPublicKeyFromPrivateKey(privateKey));
    } else if(config.peersDNS[dns]){
      var publicKey = config.peersDNS[dns];
      console.log('type : peer DNS');
      console.log('public Key : '+publicKey);
    } else {
      console.error('not found')
    }

  });

program.command('list-announces')
  .description('List all announces and their public key')
  .action(function(dns){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    var config = server.getConfig();
    var dnsList = Object.keys(config.announced);

    console.log(dnsList.length+ ' announces');
    console.log('');
    dnsList.forEach(function(dns){
      var privateKey = config.announced[dns];
      console.log(dns+ ' => '+bitauth.getPublicKeyFromPrivateKey(privateKey));
    });

  });

program.command('add <dns> <publicKey>')
  .description('Add a peer DNS')
  .action(function(dns, publicKey){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    if(server.addPeer(dns, publicKey) ){
      console.log('done')
    } else {
      console.log('failed')
    }
  });

program.command('list-peers')
  .description('Display peers DNS')
  .action(function(dns){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    var config = server.getConfig();
    var addressList = Object.keys(config.peersDNS);

    console.log(addressList.length+ ' peer(s)');
    console.log('');
    addressList.forEach(function(dns){
      console.log(dns+ ' => '+config.peersDNS[dns] /* public key */);
    });

  });


program.command('remove <dns>')
  .description('Remove a DNS from peer and announced DNS lists')
  .action(function(dns){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    if(server.remove(dns) ){
      console.log('done')
    } else {
      console.log('failed')
    }
  });
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
