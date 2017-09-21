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
            -stun=192.168.2.170:3478 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 \
            -httpport=8080 -httpsport=8888
```
Open chrome and enter URL(https://XXX.XXX.XXX.XXX:8888 or https://XXX.XXX.XXX.XXX:8080 ).

warnning:Replace the IP(XXX.XXX.XXX.XXX) with your real IP address.

# Other test
1. Only test stun
```
turnserver --no-auth --stun-only -v
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
                      -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key  \
                      -httpport=8080 -httpsport=8888 \
                      -stun=192.168.2.170:3478 
```

2. Test turn with static username and password
```
turnserver -v  --user=daozhao:12345 --realm apprtc  --no-stun
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -httpport=8080 -httpsport=8888 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-password=12345 
```

3. Test turn with auth-secret
```
turnserver -v  --user=daozhao  --realm apprtc --static-auth-secret=654321  --no-stun
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -httpport=8080 -httpsport=8888 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 
```
warnning:Please put two devices in different networks so that they cannot access each other.

# Help
```
$GOPATH/bin/apprtc-go --help
Usage of /home/daozhao/Documents/SourceCode/goPath/bin/apprtc-go:
  -cert string
    	cert pem file  (default "./mycert.pem")
  -httpport int
    	The http port that the server listens on (default 8080)
  -httpsport int
    	The https port that the server listens on (default 8888)
  -key string
    	cert key file  (default "./mycert.key")
  -room-server string
    	The origin of the room server (default "https://appr.tc")
  -stun string
    	Enter stun server ip:port,for example 192.168.2.170:3478,default is null
  -turn string
    	Enter turn server ip:port,for example 192.168.2.170:3478,default is null
  -turn-password string
    	Enter turn server user password,default is null
  -turn-static-auth-secret string
    	Enter turn server static auth secret,default is null
  -turn-username string
    	Enter turn server username,default is null
```



