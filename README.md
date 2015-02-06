# DNS Server via DHT

Provides a DNS server that resolves domain names over the DHT. 

See [dns-via-dht](https://github.com/maboiteaspam/dns-via-dht)

Pretty simple for now, no support for nss or upnp.

# Beware

Still a work in progress : )

# Install

```zsh
npm i maboiteaspam/dns-server-via-dht -g
```

# Run

#### Terminal 1
```zsh
dns-server-via-dht start 
```

#### Terminal 2

Using Terminal 1 Public key.

```zsh
dns-server-via-dht announce 'some.domain' 'some passphrase'
```


# Usage

```zsh
  Usage: cli [options] [command]


  Commands:

    start [options]              Start DNS server
    announce <dns> [passphrase]  Announce a DNS, passphrase is optional, it creates one for you
    show <dns>                   Show passphrase & public key of a dns
    list-announces               List all announces and their public key
    list-book                    Display address book content

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -v, --verbose  enable verbosity

  Start command Options:

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

