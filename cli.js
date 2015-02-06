#!/usr/bin/env node

var program = require('commander');
var bitauth = require('bitauth');
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

    if (command.knodes) {
      opts.K = program.knodes;
    }

    if (command.bootstrap === '') {
      opts.bootstrap = false;
    } else if (command.bootstrap) {
      opts.bootstrap = command.bootstrap;
    }

    var server = new DHTDNSServer(opts);

    server.start(function(){
      console.log('Server ready');
      if(command.detach) {
        process.unref();
      }
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

    var server = new DHTDNSServer(opts);

    if(server.announce(dns, passphrase) ){
      console.log('done')
    } else {
      console.log('failed')
    }

  });

program.command('show <dns>')
  .description('Show information about announced dns')
  .action(function(dns){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    var config = server.getConfig();

    if(config.announced[dns]){
      var privateKey = config.announced[dns];
      console.log('announced : yes');
      console.log('passphrase : '+privateKey);
      console.log('public Key : '+bitauth.getPublicKeyFromPrivateKey(privateKey));
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

program.command('list-book')
  .description('Display address book content')
  .action(function(dns, command){
    var opts = {};

    if (program.verbose) {
      process.env['DEBUG'] = '*';
      process.env['DEBUG'] = 'dns-server-via-dht';
    }

    var server = new DHTDNSServer(opts);

    var config = server.getConfig();
    var addressList = Object.keys(config.addressBook);

    console.log(addressList.length+ ' addresses');
    console.log('');
    addressList.forEach(function(dns){
      console.log(dns+ ' => '+config.addressBook[dns]);
    });

  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
