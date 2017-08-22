# apprtc-go
apprtc demo with golang.It's rewrite project WebRTC(https://github.com/webrtc/apprtc)  with golang

#How to run.
```
go install github.com/daozhao/apprtc-go
$GOPATH/bin/apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
                      -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key  \
                      -host=192.168.2.170 \
                      -stun=192.168.2.170:3478 \
                      -wsport=8089
```
Open chrome and enter URL(https://192.168.2.170:8080).

warnning:Replace the IP(192.168.2.170) with your real IP address

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
    	Enter stun server ip:port (default "192.168.2.170:3478")
  -tls
    	whether TLS is used (default true)
  -webport int
    	The TCP port that the server listens on (default 8080)
  -wsport int
    	The TCP port that the server listens on (default 443)
```

