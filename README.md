# DNS Server via DHT

Provides a command line to start and configure a DNS server.
It resolves and announces domain names over the DHT.

For implementation details of the announcement negotiation
see [dns-via-dht](https://github.com/maboiteaspam/dns-via-dht)

For DNS specification implementation
see [node-dns](https://github.com/tjfontaine/node-dns)

Pretty simple for now, no support of nss or upnp.

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
dig @0.0.0.0 -p 9080 my-friend-dns.com

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
    remove <dns>                         Remove a DNS from peer 
                                         and announced DNS lists

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -v, --verbose             enable verbosity
    -c, --config-path <path>  path to configuration file


  [start|resolve] options command :

    -d, --detach               detach process and run in background
    
    --dht-port <port>          port on which the DHT listens
    --dht-hostname <hostname>  hostname on which DHT listens
    
    --dns-port <port>          port on which the DNS listens
    --dns-hostname <hostname>  hostname on which DNS listens
    
    -K, --knodes <K>           K nodes to find before the DHT is ready
    -b, --bootstrap <nodes>    ip:port address of the bootstrap nodes, 
                               or, 'diy' to scan the network for the BT DHT
```

# Test

##### Terminal 1

```zsh
node cli.js start --dht-port 9090 \
--dht-hostname '127.0.0.1' -K 1 -b '' -v --dns-hostname 127.0.0.1
```

##### Terminal 2

```zsh
node cli.js start --dns-port 9081 --dht-port 9091 \
--dht-hostname '127.0.0.1' -K 1 -b '127.0.0.1:9090' \
-v -c ./2nd-node.json --dns-hostname 127.0.0.1
```

##### Terminal 3

```zsh
node cli.js announce some.com whatever
```

```zsh
> dig @0.0.0.0 -p 9080 some.com
...
;; QUESTION SECTION:
;some.com.                      IN      A

;; ANSWER SECTION:
some.com.               600     IN      A       127.0.0.1
...
```

you ve just resolved a locally announced domain name.

```zsh
> dig @0.0.0.0 -p 9081 some.com
...
;; QUESTION SECTION:
;some.com.                      IN      A
...
```

you ve confirm you can t resolve a domain this node does not know about.

```zsh
node cli.js add some.com <publicKey> -c ./2nd-node.json -v
```

you ve just added some.com to its peer list, you can now resolve it.

```zsh
> dig @0.0.0.0 -p 9081 some.com
...
;; QUESTION SECTION:
;some.com.                      IN      A

;; ANSWER SECTION:
some.com.               600     IN      A       127.0.0.1
...
```

done, you ve been able to resolve it.

```zsh
node cli.js remove some.com -c ./2nd-node.json -v
```

you ve just forgot the peer.

```zsh
node cli.js remove some.com -v
```

you ve just forgot the announcement.

```zsh
> dig @0.0.0.0 -p 9080 some.com
...
;; QUESTION SECTION:
;some.com.                      IN      A
...
```

```zsh
> dig @0.0.0.0 -p 9081 some.com
...
;; QUESTION SECTION:
;some.com.                      IN      A
...
```

dig does not resolve anything anymore.


# TODO

- check nss / upnp / alternative support to ease the use
- add tests
- test IRL

