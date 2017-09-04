# apprtc-go
apprtc demo with golang. It's rewrite project WebRTC(https://github.com/webrtc/apprtc)  with golang

# How to run.
1. Setup the STUN server and run.
coturn[https://github.com/coturn/coturn]
```
turnserver --no-auth --stun-only
```
2. Install apprtc-go and run.
```
go get github.com/daozhao/apprtc-go
cd $GOPATH/src/github.com/daozhao/apprtc-go/
go build -o apprtc-go apprtc.go
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
                      -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key  \
                      -host=192.168.2.170 \
                      -stun=192.168.2.170:3478 \
                      -wsport=8089

```
Open chrome and enter URL(https://192.168.2.170:8080).

warnning:Replace the IP(192.168.2.170) with your real IP address

# Help
```
$GOPATH/bin/apprtc-go --help
Usage of /home/daozhao/Documents/SourceCode/goPath/bin/apprtc-go:
  -cert string
    	cert pem file  (default "./mycert.pem")
  -host string
    	Enter your hostname or host ip (default "192.168.2.30")
  -key string
    	cert key file  (default "./mycert.key")
  -room-server string
    	The origin of the room server (default "https://appr.tc")
  -stun string
    	Enter stun server ip:port,for example 192.168.2.170:3478,default is null
  -tls
    	whether TLS is used (default true)
  -turn string
    	Enter turn server ip:port,for example 192.168.2.170:3478,default is null
  -turn-password string
    	Enter turn server user password,default is null
  -turn-static-auth-secret string
    	Enter turn server static auth secret,default is null
  -turn-username string
    	Enter turn server username,default is null
  -webport int
    	The TCP port that the server listens on (default 8080)
  -wsport int
    	The TCP port that the server listens on (default 443)
```


turnadmin -a -u ninefingers -r apprtc -p youhavetoberealistic
./bin/turnserver -v -a -f --use-auth-secret --static-auth-secret=4080218913 -realm apprtc -b ./bin/turndb --no-tls --no-dtls --no-stun

./bin/turnserver -v -a -f -r apprtc -c ./bin/turnserver.conf --no-tls --no-dtls -b ./bin/turndb

listening-port=3478
min-port=59000
max-port=65000
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=4080218913
realm=apprtc
stale-nonce
no-loopback-peers
no-multicast-peers
mobility
no-cli
no-tlsv1
no-tlsv1_1



