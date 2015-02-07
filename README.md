# DNS Server via DHT

Provides a command line to start and configure a DNS server 
that resolves and announces domain names over the DHT.

For implementation details of the announcement negotiation
see [dns-via-dht](https://github.com/maboiteaspam/dns-via-dht)

For DNS specification implementation
see [node-dns](https://github.com/tjfontaine/node-dns)

Pretty simple for now, no support for nss or upnp.

# Beware

Still a work in progress : )

# Install

```zsh
npm i maboiteaspam/dns-server-via-dht -g
```

# Run

```zsh
dns-server-via-dht start --detach
dns-server-via-dht announce 'some.domain' 'some passphrase'
dns-server-via-dht add 'my-friend-dns.com' 'his public key'
dns-server-via-dht resolve 'my-friend-dns.com' 'his public key'
dns-server-via-dht remove 'my-friend-dns.com'
```

# Usage

```zsh
  Usage: cli [options] [command]


  Commands:

    start [options]                      Start DNS server
    resolve [options] <dns> <publicKey>  Resolve a peer DNS
    announce <dns> <passphrase>          Announce a DNS
    show <dns>                           Show passphrase & public key of a dns
    list-announces                       List all announces and their public key
    add <dns> <publicKey>                Add a peer DNS
    list-peers                           Display peers DNS
    remove <dns>                         Remove a DNS from peer and announced DNS lists

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -v, --verbose  enable verbosity


  [start|resolve] options command :

    -d, --detach                      detach process and run in background
    
    -dhtp, --dht-port <port>          port on which the DHT listens
    -dhth, --dht-hostname <hostname>  hostname on which DHT listens
    
    -dnsp, --dns-port <port>          port on which the DNS listens
    -dnsh, --dns-hostname <hostname>  hostname on which DNS listens
    
    -K, --knodes <K>                  K nodes to find before he DHT is ready
    -b, --bootstrap <nodes>           ip:port address of the bootstrap nodes, 
                                      or, 'diy' to scan the network for the BT DHT
```

# TODO

- add dig example command
- add tests
- test IRL
- implement nss or something like this ? Or find good browser plugin ?

