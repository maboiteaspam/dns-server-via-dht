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

program
  .option('-c, --config-path <path>',
  'path to configuration file');

program.command('start')

  .option('--dns-port <port>',
  'port on which the DNS listens')
  .option('--dns-hostname <dnsHostname>',
  'hostname on which DNS listens')

  .option('--dht-port <dhtPort>',
  'port on which the DHT listens')
  .option('--dht-hostname <hostname>',
  'hostname on which DHT listens')

  .option('-K, --knodes <K>',
  'K nodes to find before the DHT is ready')
  .option('-b, --bootstrap [nodes]',
  'ip:port address of the bootstrap nodes, or, \'diy\' to scan the network for the BT DHT')

  .option('-d, --detach',
  'Detach process')

  .description('Start DNS server')
  .action(function(port){
    var command = arguments[arguments.length-1];
    var opts = {
      port: parseInt(command.dhtPort) || 9090,
      dnsPort: parseInt(command.dnsPort) || 9080,
      hostname: command.dhtHostname || '0.0.0.0',
      dnsHostname: command.dnsHostname || '0.0.0.0'
    };

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

    if (program.verbose) {
      process.env['DEBUG'] = 'dns-server-via-dht';
      process.env['DEBUG'] = '*';
    }
    var debug = require('debug')('dns-server-via-dht');

    if (command.knodes) {
      opts.K = command.knodes;
    }

    if (command.bootstrap === true /* -b '' */) {
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
        console.log('DNS server : ' + server.getDnsAddress());
        console.log('DHT server : ' + server.getDhtAddress());
      });
    };

    if(command.detach) {
      var cmdLine = [];
      process.argv.forEach(function (val) {
        if(!val.match(/^(-d|--detach)$/) ) cmdLine.push(val);
      });
      debug('%s', cmdLine)
      var detachedProcess = spawn(cmdLine.shift(), cmdLine,
      {detached: true, stdio:'inherit' });
      detachedProcess.unref();
    } else {
      startProgram();
    }
  });

program.command('resolve <dns> <publicKey>')
  .description('Resolve a peer DNS')

  .option('--dns-port <port>',
  'port on which the DNS listens')
  .option('--dns-hostname <hostname>',
  'hostname on which DNS listens')

  .option('--dht-port <port>',
  'port on which the DHT listens')
  .option('--dht-hostname <hostname>',
  'hostname on which DHT listens')

  .option('-K, --knodes <K>',
  'K nodes to find before the DHT is ready')
  .option('-b, --bootstrap <nodes>',
  'ip:port address of the bootstrap nodes, or, \'diy\' to scan the network for the BT DHT')

  .action(function(dns, publicKey, command){
    var opts = {
      port: parseInt(command.dhtPort) || 9090,
      dnsPort: parseInt(command.dnsPort) || 9080,
      hostname: command.dhtHostname || '0.0.0.0',
      dnsHostname: command.dnsHostname || '0.0.0.0'
    };

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

    if (program.verbose) {
      process.env['DEBUG'] = 'dns-server-via-dht';
      process.env['DEBUG'] = '*';
    }
    var debug = require('debug')('dns-server-via-dht');

    if (command.knodes) {
      opts.K = command.knodes;
    }

    if (command.bootstrap === true /* -b '' */) {
      opts.bootstrap = false;
    } else if (command.bootstrap) {
      opts.bootstrap = command.bootstrap;
    }

    debug('port=%s', command.dhtPort );
    debug('bootstrap=%s', command.bootstrap );
    debug('knodes=%s', command.knodes );
    debug('verbose=%s', command.verbose );

    debug('%s', JSON.stringify(opts) );

    var server = new DHTDNSServer(opts);
///node cli.js resolve some.com 03e322e5c11b10dca11ca5b30f2936ef78cbf147e99b4cd2066be5d67853168e98 --dns-port 9082 --dht-port 9092 --dht-hostname '127.0.0.1' -K 1 -b '127.0.0.1:9090' -v -c ./tt.json
    console.log('Starting server');
    server.start(function(){
      console.log('Server ready');
      console.log('DNS server : ' + server.getDnsAddress());
      console.log('DHT server : ' + server.getDhtAddress());
      server.resolve(dns, publicKey, function(err, response){
        console.log('Resolved done');
        if(err){
          console.error('resolve failed')
          console.error(err)
        } else{

          if(response.privateKey) {
            console.error('resolved a local dns')
          }
          console.log(response.ip + '\t' + response.dns);
        }
        server.stop();
      })
    });

  });


program.command('announce <dns> <passphrase>')
  .description('Announce a DNS')
  .action(function(dns, passphrase){
    var opts = {};

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }
    var debug = require('debug')('dns-server-via-dht');

    debug('%s', JSON.stringify(opts) );

    var server = new DHTDNSServer(opts);

    if(server.addAnnounce(dns, passphrase) ){
      console.error('Added !');
    } else {
      console.error('Already announced !');
    }

    console.log('Your public key is');
    console.log(''+server.getAnnouncePublicKey(dns));

  });

program.command('show <dns>')
  .description('Show passphrase & public key of a dns')
  .action(function(dns){
    var opts = {};

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

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

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

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

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    if(server.addPeer(dns, publicKey) ){
      console.error('Added !')
    } else {
      console.error('Already announced !')
      if(server.editPeer(dns, publicKey) ){
        console.error('Updated !')
      } else {
        console.error('Edit has failed !')
      }
    }
  });

program.command('list-peers')
  .description('Display peers DNS')
  .action(function(dns){
    var opts = {};

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

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

    if (program.configPath) {
      opts.configPath = program.configPath;
    }

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    if(server.remove(dns) ){
      console.log('Done !')
    } else {
      console.log('No such DNS recorded !')
    }
  });


program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
