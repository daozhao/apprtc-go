
# apprtc-go
这个项目是使用golang重写apprtc[https://github.com/webrtc/apprtc],为了方便在自有服务器部署，无须安装Google App Engine.

# cotrun使用
coturn[https://github.com/coturn/coturn]是一个开源的turn/stun的服务器，大家可以使用它进行webrtc的测试搭建。当然也可以用于生产环境。此文只是介绍其用于测试环境如何配置其用户于验证。这里可以配合apprtc-go[https://github.com/daozhao/apprtc-go]的测试进行说明。

coturn服务器是包括了turn和stun这两个服务的。如果你只需要stun服务。按照下边的命令启动就可以。（假设turn服务器和apprtc-go服务器都运行在192.168.2.170上）
```
turnserver --no-auth --stun-only -v
参数说明：
--no-auth  不做用户认证，只有stun可以不用用户认证，turn服务，在iceServer中必须给出用户名认证等，要不然页面建立peerConnect的时候报错。
--stun-only  服务器制作stun服务，不做turn服务。
-v       打印log信息。请不要用-V,大V的信息量太多了。
```

apprtc-go的启动需要添加stun参数給，命令如下
```
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
                      -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key  \
                      -host=192.168.2.170 \
                      -stun=192.168.2.170:3478 \
                      -wsport=8089
```
iceServer返回json，只有stun服务器列表。
```
{"iceServers":[
{
   "urls": [
           "stun:192.168.2.170:3478"
           ]
}
]}
```

这样在浏览器就可以键入https://192.168.2.170:8080,就可以进行测试。建议使用两台机器，并连接到不同的的子路由器下进行测试。

测试turn服务，固定用户名，密码
```
turnserver -v  --user=daozhao:12345 --realm apprtc  --no-stun
```
apprtc-go启动的时候添加turn服务器参数，使用静态用户名密码。
```
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-password=12345 \
            -wsport=8089
```
iceServers返回，注意，如果使用turn服务列表，必须有username和credential。这里的用户名密码是静态的。
```
{"iceServers":[
{
    "urls": [
      "turn:192.168.2.170:3478?transport=udp"
    ],
    "username": "daozhao",
    "credential": "12345"
  }
]}
```
测试turn服务，动态验证用户名，密码：
```
turnserver -v  --user=daozhao  --realm apprtc --static-auth-secret=654321  --no-stun
```
apprtc-go启动命令行。
```
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 \
            -wsport=8089
```
iceServers返回，注意这里是一个动态的用户名密码。这个用户名密码的计算方法：
用户名由两段组成   timestamp:username
credential的计算方式  base64(sha1_HMAC(timestamp:username,secret-key))

详细的参考这里[https://www.ietf.org/proceedings/87/slides/slides-87-behave-10.pdf]
```
{"iceServers":[
{
    "urls": [
      "turn:192.168.2.170:3478?transport=udp"
    ],
    "username": "1504596938:daozhao",
    "credential": "k/yZNM4Jfofkqqa7ygBP5yCstow="
  }
]}
```

下边是一个完全事例。
```
turnserver -v  --user=daozhao:12345 --realm apprtc 
```

```
./apprtc-go -cert=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.pem \
            -key=$GOPATH/src/github.com/daozhao/apprtc-go/mycert.key \
            -host=192.168.2.170 \
            -stun=192.168.2.170:3478 \
            -turn=192.168.2.170:3478 -turn-username=daozhao -turn-static-auth-secret=654321 \
            -wsport=8089
```

iceServer返回：
```
{"iceServers":[
{
    "urls": [
      "stun:192.168.2.170:3478"
    ]
  }
,
{
    "urls": [
      "turn:192.168.2.170:3478?transport=udp"
    ],
	"username": "1504598153:daozhao",
	"credential": "+pUWOR9wKKgBRXQoLJ7tl2PlFSA="
  }
]}
```

# 帮助
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
# 相关项目
 apprtc-electron[https://github.com/daozhao/apprtc-electron]


