# apprtc-go
apprtc demo with golang. It's rewrite project WebRTC(https://github.com/webrtc/apprtc)  with golang

# How to run.
1. Setup the STUN/TURN server and run.
coturn[https://github.com/coturn/coturn]
```
turnserver -v  --user=daozhao --realm apprtc --static-auth-secret=654321 
```
2. Install apprtc-go and run.
```
go get github.com/daozhao/apprtc-go
cd $GOPATH/src/github.com/daozhao/apprtc-go/
go build -o apprtc-go apprtc.go
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -stun=192.168.2.170:3478 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 \
            -wsport=8089
```
Open chrome and enter URL(https://192.168.2.170:8080).

warnning:Replace the IP(192.168.2.170) with your real IP address.
Please put two devices in different networks so that they cannot access each other.

# Other test
1. Only test stun
```
turnserver --no-auth --stun-only -v
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
                      -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key  \
                      -host=192.168.2.170 \
                      -stun=192.168.2.170:3478 \
                      -wsport=8089
```

2. Test turn with static username and password
```
turnserver -v  --user=daozhao:12345 --realm apprtc  --no-stun
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-password=12345 \
            -wsport=8089
```

3. Test turn with auth-secret
```
turnserver -v  --user=daozhao  --realm apprtc --static-auth-secret=654321  --no-stun
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 \
            -wsport=8089
```

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



