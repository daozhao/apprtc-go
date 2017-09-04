package main

import (
	"crypto/hmac"
	"crypto/sha1"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/daozhao/apprtc-go/collider"
	// "reflect"
)

/*
const (
	CERT        = "./mycert.pem"
	KEY         = "./mycert.key"
	wssHostPort = "8089"
	wssHost     = "192.168.2.30"
	PORT        = 8888
)
*/

var TURN_SERVER_OVERRIDE string

const STUN_SERVER_FMT = `
{
    "urls": [
      "stun:%s"
    ]
  }
`
const TURN_SERVER_FMT = `
{
    "urls": [
      "turn:%s?transport=udp"
    ],
	"username": "%s",
	"credential": "%s"
  }
`
const TURN_SERVER_FMT_TEST = `
{
    "urls": [
      "turn:%s?transport=udp"
    ],
	"credential": "%s:%s"
  }
`

var TURN_BASE_URL string = "https://computeengineondemand.appspot.com"
var TURN_URL_TEMPLATE string = `"%s/turn?username=%s&key=%s"`
var CEOD_KEY string = "4080218913"

var ICE_SERVER_BASE_URL string = "https://"
var ICE_SERVER_URL_TEMPLATE string = `"https://%s:%d/iceconfig?key=%s"`
var ICE_SERVER_API_KEY string = "4080218913" //os.environ.get('ICE_SERVER_API_KEY')

var CALLSTATS_PARAMS string = `{"appSecret": "none", "appId": "none"}`

/*
{
  'appId': os.environ.get('CALLSTATS_APP_ID'),
  'appSecret': os.environ.get('CALLSTATS_APP_SECRET')
}`
*/
/*
var WSS_INSTANCE_HOST_KEY string = "host_port_pair"
var WSS_INSTANCE_NAME_KEY string = "vm_name"
var WSS_INSTANCE_ZONE_KEY string = "zone"
var WSS_INSTANCES string = `[{
    # WSS_INSTANCE_HOST_KEY: 'apprtc-ws.webrtc.org:443',
    WSS_INSTANCE_HOST_KEY: '192.168.2.97:8089',
    WSS_INSTANCE_NAME_KEY: 'wsserver-std',
    WSS_INSTANCE_ZONE_KEY: 'us-central1-a'
}, {
    # WSS_INSTANCE_HOST_KEY: 'apprtc-ws-2.webrtc.org:443',
    WSS_INSTANCE_HOST_KEY: '192.168.2.97:8089',
    WSS_INSTANCE_NAME_KEY: 'wsserver-std-2',
    WSS_INSTANCE_ZONE_KEY: 'us-central1-f'
}]`
*/

const (
	RESPONSE_ERROR            = "ERROR"
	RESPONSE_ROOM_FULL        = "FULL"
	RESPONSE_UNKNOWN_ROOM     = "UNKNOWN_ROOM"
	RESPONSE_UNKNOWN_CLIENT   = "UNKNOWN_CLIENT"
	RESPONSE_DUPLICATE_CLIENT = "DUPLICATE_CLIENT"
	RESPONSE_SUCCESS          = "SUCCESS"
	RESPONSE_INVALID_REQUEST  = "INVALID_REQUEST"

	LOOPBACK_CLIENT_ID = "LOOPBACK_CLIENT_ID"
)

type Client struct {
	Id           string
	is_initiator bool
	messages     []string
	messageLen   int
}

func NewClient(clientId string, initiator bool) *Client {
	return &Client{Id: clientId, is_initiator: initiator, messages: make([]string, 10), messageLen: 0}

}
func (c *Client) AddMessage(msg string) {
	if c.messageLen < len(c.messages) {
		c.messages[c.messageLen] = msg
		c.messageLen = c.messageLen + 1
	}
	//c.messages = append(c.messages,msg)
}
func (c *Client) CleanMessage() {
	c.messageLen = 0
}

func (c *Client) GetMessages() []string {
	return c.messages[0:c.messageLen]
}

func (c *Client) SetInitiator(initiator bool) {
	c.is_initiator = initiator
}

/*
 */
type Room struct {
	Id      string
	clients map[string]*Client
}

//
func NewRoom(roomId string) *Room {
	return &Room{Id: roomId, clients: make(map[string]*Client)}
}

//
func (r *Room) AddClient(c *Client) {
	r.clients[c.Id] = c
}

//
func (r *Room) RemoveClient(client_id string) {
	_, ok := r.clients[client_id]
	if ok {
		delete(r.clients, client_id)
	}
}
func (r *Room) HasClient(client_id string) bool {
	_, ok := r.clients[client_id]
	return ok
}
func (r *Room) GetClient(client_id string) (*Client, bool) {
	client, ok := r.clients[client_id]
	if ok {
		return client, true
	}
	return nil, false
}
func (r *Room) GetOtherClient(client_id string) (*Client, bool) {
	for key, client := range r.clients {
		if key != client_id {
			return client, true
		}
	}
	return nil, false
}

func (r *Room) GetOccupancy() int {
	return len(r.clients)
}

func (r *Room) GetStatus() []string {
	var result []string
	var i int = 0
	result = make([]string, len(r.clients))
	for key, _ := range r.clients {
		result[i] = key
		i = i + 1
	}

	return result
	// abc := map[string]int{
	//     "a": 1,
	//     "b": 2,
	//     "c": 3,
	// }

	// keys := reflect.ValueOf(abc).MapKeys()

	// fmt.Println(keys) // [a b c]
}

var RoomList map[string]*Room

func getRequest(r *http.Request, key, def string) string {
	value := r.Form.Get(key)
	if len(value) == 0 {
		return def
	}
	return value
}
func getWssParameters(r *http.Request) (string, string) {
	wssHostPortPair := r.Form.Get("wshpp")
	wssTLS := getRequest(r, "wstls", strconv.FormatBool(useTls))
	// http://127.0.0.1:8080/?wstls=false&wshpp=192.168.2.97:4443

	if len(wssHostPortPair) == 0 {
		log.Println("getWssParameters, r.Host:", r.Host)
		wssHostPortPair = r.Host
		wssHostPortPair = wssHost + ":" + strconv.Itoa(wssHostPort) // "192.168.2.30:8089"
	}
	// log.Println("r:",r)
	// if strings.Index(r.Scheme,"http://") == 0 {
	// 	wssTLS = "false"
	// }
	// wssTLS = "false"
	var wssUrl, wssPostUrl string
	if strings.EqualFold(wssTLS, "false") {
		wssUrl = "ws://" + wssHostPortPair + "/ws"
		wssPostUrl = "http://" + wssHostPortPair
	} else {
		wssUrl = "wss://" + wssHostPortPair + "/ws"
		wssPostUrl = "https://" + wssHostPortPair
	}
	return wssUrl, wssPostUrl
}
func roomPageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("roomPageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	room_id := strings.Replace(r.URL.Path, "/r/", "", 1)
	room_id = strings.Replace(room_id, "/", "", -1)
	//todo: 检查房间是否已经超过两人。
	log.Println("room page room_id:", room_id)
	t, err := template.ParseFiles("./html/index_template.html")
	// t, err := template.ParseFiles("./html/params.html")
	if err != nil {
		log.Println(err)
	}
	room, ok := RoomList[room_id]
	if ok {
		if room.GetOccupancy() >= 2 {
			t, err = template.ParseFiles("./html/full_template.html")
			t.Execute(w, nil)
			return

		}
	}

	data := getRoomParameters(r, room_id, "", nil)

	t.Execute(w, data)
	// t.Execute(w, nil)
}
func addClientToRoom(r *http.Request, room_id, client_id string, is_loopback bool) (map[string]interface{}, bool) {
	room, ok := RoomList[room_id]
	if !ok {
		room = NewRoom(room_id)
		RoomList[room_id] = room
	}
	var is_initiator bool
	var messages []string
	error := ""
	occupancy := room.GetOccupancy()

	if occupancy >= 2 {
		error = RESPONSE_ROOM_FULL
	}
	if room.HasClient(client_id) {
		error = RESPONSE_DUPLICATE_CLIENT
	}
	if 0 == occupancy {
		is_initiator = true
		room.AddClient(NewClient(client_id, is_initiator))
		if is_loopback {
			room.AddClient(NewClient(LOOPBACK_CLIENT_ID, false))
		}
		messages = make([]string, 1)

	} else {
		is_initiator = false
		other_client, _ := room.GetOtherClient(client_id)
		messages = other_client.GetMessages()
		room.AddClient(NewClient(client_id, is_initiator))
		other_client.CleanMessage()
		log.Println("addClientToRoom message:", messages)

	}
	var params map[string]interface{}
	params = make(map[string]interface{})

	params["error"] = error
	params["is_initiator"] = is_initiator
	params["messages"] = messages
	params["room_state"] = room.GetStatus()

	return params, (len(error) == 0)
}

func joinPageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("joinPageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	room_id := strings.Replace(r.URL.Path, "/join/", "", 1)
	room_id = strings.Replace(room_id, "/", "", -1)

	log.Println("join page room_id:", room_id)
	client_id := fmt.Sprintf("%d", rand.Intn(1000000000))
	is_loopback := (getRequest(r, "debug", "") == "loopback")

	result, ok := addClientToRoom(r, room_id, client_id, is_loopback)

	var resultStr string
	var returnData map[string]interface{}
	var params map[string]interface{}
	if !ok {
		log.Println("Error adding client to room:", result["error"], ", room_state=", result["room_state"])
		resultStr, _ = result["error"].(string)
		returnData = make(map[string]interface{})
		//return
	} else {
		resultStr = "SUCCESS"
		is_initiator := strconv.FormatBool(result["is_initiator"].(bool))
		log.Println("joinPageHandler  is_initiator:", result["is_initiator"], " String:", is_initiator)
		returnData = getRoomParameters(r, room_id, client_id, is_initiator)
		returnData["messages"] = result["messages"]
		//   returnData["is_initiator"] = "true"
	}

	params = make(map[string]interface{})

	params["result"] = resultStr
	params["params"] = returnData

	//todo 输出json数据返回
	enc := json.NewEncoder(w)
	enc.Encode(&params)
}

func removeClientFromRoom(room_id, client_id string) map[string]interface{} {
	log.Println("removeClientFromRoom room:", room_id, " client:", client_id)
	var result map[string]interface{}
	result = make(map[string]interface{})

	room, ok := RoomList[room_id]

	if !ok {
		log.Println("removeClientFromRoom: Unknow room:", room_id)
		result["error"] = RESPONSE_UNKNOWN_ROOM
		result["room_state"] = ""
		return result
	}

	if !room.HasClient(client_id) {
		log.Println("removeClientFromRoom: Unknow client:", client_id)
		result["error"] = RESPONSE_UNKNOWN_CLIENT
		result["room_state"] = room.GetStatus()
		return result
	}
	room.RemoveClient(client_id)
	room.RemoveClient(LOOPBACK_CLIENT_ID)
	if room.GetOccupancy() > 0 {
		client, _ := room.GetOtherClient(client_id)
		client.SetInitiator(true)
	} else {
		delete(RoomList, room_id)
	}

	result["error"] = ""
	result["room_state"] = room.GetStatus()
	return result
}

func leavePageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("leavePageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	//room_id := strings.Replace(r.URL.Path,"/leave/","",1)
	var room_id, client_id string
	url := strings.Split(r.URL.Path, "/")
	log.Println("url array:", url)
	if len(url) >= 3 {
		room_id = url[2]
		client_id = url[3]
		// fmt.Sscanf(r.URL.Path, "/leave/%s/", &room_id, &client_id)
		//log.Println("leave room:",room_id," client:",client_id)
		result := removeClientFromRoom(room_id, client_id)
		//result := removeClientFromRoom(strconv.Itoa(room_id), strconv.Itoa(client_id))
		if len(result["error"].(string)) == 0 {
			log.Println("Room:", room_id, " has state ", result["room_state"])
		}
	}

}
func saveMessageFromClient(room_id, client_id, message_json string) map[string]interface{} {
	log.Println("saveMessageFrom room:", room_id, " client:", client_id, " msg:", message_json)
	var result map[string]interface{}
	result = make(map[string]interface{})
	room, ok := RoomList[room_id]

	result["saved"] = false
	if !ok {
		log.Println("saveMessageFromClient: Unknow room:", room_id)
		result["error"] = RESPONSE_UNKNOWN_ROOM
		return result
	}

	client, has := room.GetClient(client_id)
	if !has {
		log.Println("saveMessageFromclient: Unknow client:", client_id)
		result["error"] = RESPONSE_UNKNOWN_CLIENT
		return result
	}
	if room.GetOccupancy() > 1 {
		result["error"] = ""
		return result
	}

	client.AddMessage(message_json)
	result["error"] = ""
	result["saved"] = true
	return result

}
func messagePageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("messagePageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	var room_id, client_id string
	url := strings.Split(r.URL.Path, "/")
	log.Println("url array:", url)
	if len(url) >= 3 {
		room_id = url[2]
		client_id = url[3]

		body, err := ioutil.ReadAll(r.Body)
		if err != nil {

		}
		message_json := string(body)
		result := saveMessageFromClient(room_id, client_id, message_json)

		if !result["saved"].(bool) {
			_, wss_post_url := getWssParameters(r)
			resp, err := http.Post(wss_post_url+"/"+room_id+"/"+client_id, "application/x-www-form-urlencoded", strings.NewReader(message_json))
			if err != nil {
				fmt.Println(err)
			}
			if resp.StatusCode != 200 {
				log.Println("Failed to send message to collider:", resp.StatusCode)
			}
		}

		var params map[string]interface{}
		params = make(map[string]interface{})
		params["result"] = RESPONSE_SUCCESS
		enc := json.NewEncoder(w)
		enc.Encode(&params)
	}
}
func paramsPageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("paramsPageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	t, _ := template.ParseFiles("./html/params.html")
	t.Execute(w, nil)

}
func aPageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("aPageHandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
}

func iceconfigPageHandler(w http.ResponseWriter, r *http.Request) {

	turnServer := ""
	if len(*flagstun) > 0 {
		turnServer += fmt.Sprintf(STUN_SERVER_FMT, *flagstun)
	}

	if len(*flagturn) > 0 {
		if len(turnServer) > 0 {
			turnServer += ","
		}
		username, password := getTurnAuth()
		turnServer += fmt.Sprintf(TURN_SERVER_FMT, *flagturn, username, password)
		// turnServer += fmt.Sprintf(TURN_SERVER_FMT, *flagturn, "teninefingers", "4080218913")
	}
	turnServer = `{"iceServers":[` + turnServer + "]}"
	log.Println("turnServer:", turnServer)
	var dat interface{}
	if err := json.Unmarshal([]byte(turnServer), &dat); err != nil {
		log.Println("json.Unmarshal error:", err)
		return
	}
	// params :=
	enc := json.NewEncoder(w)
	enc.Encode(&dat)
}

func getTurnAuth() (username, password string) {
	if len(*flagTurnSecret) > 0 {
		timestamp := time.Now().Unix() + 60*60
		turnUsername := strconv.Itoa(int(timestamp)) + ":" + *flagTurnUser
		expectedMAC := Hmac(*flagTurnSecret, turnUsername)
		return turnUsername, expectedMAC
	}

	return *flagTurnUser, *flagTurnPassword
}

func Hmac(key, data string) string {
	// https://stackoverflow.com/questions/30745153/turn-server-for-webrtc-with-rest-api-authentication?noredirect=1&lq=1
	// key: my_secret
	// user: 1433895918506:my_user_name
	// 1Dj9XZ5fwvKS6YoQZOoORcFnXaI
	hmac := hmac.New(sha1.New, []byte(key))
	hmac.Write([]byte(data))
	return base64.StdEncoding.EncodeToString(hmac.Sum(nil))
	// return base64.StdEncoding.EncodeToString(hmac.Sum([]byte("")))
}

func computePageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("computePagehandler host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
}
func mainPageHandler(w http.ResponseWriter, r *http.Request) {
	// if r.URL.Path == "/" {
	//     http.Redirect(w, r, "/login/index", http.StatusFound)
	// }
	log.Println("host:", r.Host, "url:", r.URL.RequestURI(), " path:", r.URL.Path, " raw query:", r.URL.RawQuery)
	t, err := template.ParseFiles("./html/index_template.html")
	// t, err := template.ParseFiles("./html/params.html")
	if err != nil {
		log.Println(err)
	}

	data := getRoomParameters(r, "", "", nil)

	t.Execute(w, data)
	// t.Execute(w, nil)

}

func getRoomParameters(r *http.Request, room_id, client_id string, is_initiator interface{}) map[string]interface{} {

	var data map[string]interface{}

	data = make(map[string]interface{})
	data["error_messages"] = []string{}

	data["warning_messages"] = []string{}
	data["is_loopback"] = false                                                                                     // json.dumps(debug == 'loopback'),
	data["pc_config"] = template.JS(`{"iceServers": [], "rtcpMuxPolicy": "require", "bundlePolicy": "max-bundle"}`) //json.dumps(pc_config),
	data["pc_constraints"] = template.JS(`{"optional": []}`)                                                        // json.dumps(pc_constraints),
	data["offer_options"] = template.JS("{}")                                                                       //json.dumps(offer_options),
	data["media_constraints"] = template.JS(`{"video": {"optional": [{"minWidth": "1280"}, {"minHeight": "720"}], "mandatory": {}}, "audio": true}`)

	// var dat []map[string]interface{}
	var dat interface{}
	if err := json.Unmarshal([]byte(TURN_SERVER_OVERRIDE), &dat); err != nil {
		log.Println("json.Unmarshal error:", err)
	}
	// log.Println(dat)
	data["turn_server_override"] = dat // template.JS(strings.Replace(TURN_SERVER_OVERRIDE,"\n","",-1) )

	username := fmt.Sprintf("%d", rand.Intn(1000000000)) //todo:
	if len(client_id) > 0 {
		username = client_id
	}
	data["turn_url"] = template.JS(fmt.Sprintf(TURN_URL_TEMPLATE, TURN_BASE_URL, username, CEOD_KEY))

	// ice_server_base_url := getRequest(r, "ts", ICE_SERVER_BASE_URL)
	data["ice_server_url"] = template.JS(fmt.Sprintf(ICE_SERVER_URL_TEMPLATE, wssHost, webHostPort, ICE_SERVER_API_KEY))

	data["ice_server_transports"] = getRequest(r, "tt", "")

	var dtls, include_loopback_js string

	debug := getRequest(r, "debug", "")
	if strings.EqualFold(debug, "loopback") {
		dtls = "false"
		include_loopback_js = "<script src=\"/js/loopback.js\"></script>"
	} else {
		dtls = "true"
		include_loopback_js = ""
	}
	data["include_loopback_js"] = include_loopback_js
	data["ddtls"] = dtls

	include_rtstats_js := ""
	//todo:
	//include_rtstats_js = "<script src=\"/js/rtstats.js\"></script><script src=\"/pako/pako.min.js\"></script>"
	data["include_rtstats_js"] = include_rtstats_js

	wss_url, wss_post_url := getWssParameters(r)
	data["wss_url"] = template.URL(wss_url)
	data["wss_post_url"] = template.URL(wss_post_url)

	//  bypass_join_confirmation = 'BYPASS_JOIN_CONFIRMATION' in os.environ and os.environ['BYPASS_JOIN_CONFIRMATION'] == 'True'
	bypass_join_confirmation := false
	data["bypass_join_confirmation"] = bypass_join_confirmation

	data["version_info"] = template.JS(`{"time": "Thu Feb 9 15:54:29 2017 +0800", "branch": "master", "gitHash": "9d2692c3a32b1213584ec01cb5f12d462cb82d3e"}`)
	data["callstats_params"] = template.JS(strings.Replace(CALLSTATS_PARAMS, "\n", "", -1))

	if len(room_id) > 0 {
		var room_link string
		if useTls {
			room_link = "https://" + r.Host + "/r/" + room_id + "?" + r.URL.RawQuery
		} else {
			room_link = "http://" + r.Host + "/r/" + room_id + "?" + r.URL.RawQuery
		}
		// room_link := r.Host + "/r/" + room_id + "?" + r.URL.RawQuery

		// log.Println("host:",r.Host,"  url:",r.URL.String," uri:",r.URL.RequestURI)
		data["room_id"] = room_id
		data["room_link"] = template.URL(room_link)
	}
	if len(client_id) > 0 {
		data["client_id"] = client_id
	}
	if is_initiator != nil {
		data["is_initiator"] = is_initiator
	}

	return data
}

var useTls bool
var wssHostPort int
var webHostPort int
var wssHost string

var flagUseTls = flag.Bool("tls", true, "whether TLS is used")
var flagWssHostPort = flag.Int("wsport", 443, "The TCP port that the server listens on")
var flagWebHostPort = flag.Int("webport", 8080, "The TCP port that the server listens on")
var flagWssHost = flag.String("host", "192.168.2.30", "Enter your hostname or host ip")
var flagstun = flag.String("stun", "", "Enter stun server ip:port,for example 192.168.2.170:3478,default is null")
var flagturn = flag.String("turn", "", "Enter turn server ip:port,for example 192.168.2.170:3478,default is null")
var flagTurnUser = flag.String("turn-username", "", "Enter turn server username,default is null")
var flagTurnPassword = flag.String("turn-password", "", "Enter turn server user password,default is null")
var flagTurnSecret = flag.String("turn-static-auth-secret", "", "Enter turn server static auth secret,default is null")
var roomSrv = flag.String("room-server", "https://appr.tc", "The origin of the room server")

var CERT = flag.String("cert", "./mycert.pem", "cert pem file ")
var KEY = flag.String("key", "./mycert.key", "cert key file ")

var ice_server_url string

func main() {
	flag.Parse()
	useTls = *flagUseTls
	wssHostPort = *flagWssHostPort
	webHostPort = *flagWebHostPort
	wssHost = *flagWssHost

	if len(*flagturn) > 0 {
		if len(*flagTurnUser) == 0 {
			log.Printf("If set turn server,must has turn-username")
			return
		}

		if len(*flagTurnPassword) == 0 && len(*flagTurnSecret) == 0 {
			log.Printf("If set turn server,must set turn-password or turn-static-auth-secret")
			return
		}

	}

	log.Printf("Starting collider: tls = %t, port = %d, room-server=%s", useTls, wssHostPort, *roomSrv)

	// TURN_SERVER_OVERRIDE += "["
	// if len(*flagstun) > 0 {
	// 	TURN_SERVER_OVERRIDE += fmt.Sprintf(STUN_SERVER_FMT, *flagstun)
	// }
	// if len(*flagturn) > 0 {
	// 	if len(TURN_SERVER_OVERRIDE) > 0 {
	// 		TURN_SERVER_OVERRIDE += ","
	// 	}
	// 	TURN_SERVER_OVERRIDE += fmt.Sprintf(TURN_SERVER_FMT, *flagturn)
	// }
	TURN_SERVER_OVERRIDE = "[" + TURN_SERVER_OVERRIDE + "]"

	log.Printf("TURN_SERVER_OVERRIDE:%s", TURN_SERVER_OVERRIDE)
	c := collider.NewCollider(*roomSrv)
	go c.Run(wssHostPort, useTls, *CERT, *KEY)

	RoomList = make(map[string]*Room)
	WebServeMux := http.NewServeMux()
	WebServeMux.Handle("/css/", http.FileServer(http.Dir("./")))
	WebServeMux.Handle("/js/", http.FileServer(http.Dir("./")))
	WebServeMux.Handle("/images/", http.FileServer(http.Dir("./")))
	WebServeMux.Handle("/callstats/", http.FileServer(http.Dir("./")))
	WebServeMux.Handle("/favicon.ico", http.FileServer(http.Dir("./")))
	WebServeMux.Handle("/manifest.json", http.FileServer(http.Dir("./html/")))

	WebServeMux.HandleFunc("/r/", roomPageHandler)
	WebServeMux.HandleFunc("/join/", joinPageHandler)
	WebServeMux.HandleFunc("/leave/", leavePageHandler)
	WebServeMux.HandleFunc("/message/", messagePageHandler)
	WebServeMux.HandleFunc("/params/", paramsPageHandler)
	WebServeMux.HandleFunc("/a/", aPageHandler)
	WebServeMux.HandleFunc("/compute/", computePageHandler)
	WebServeMux.HandleFunc("/iceconfig", iceconfigPageHandler)
	WebServeMux.HandleFunc("/iceconfig/", iceconfigPageHandler)
	WebServeMux.HandleFunc("/", mainPageHandler)

	var e error

	pstr := ":" + strconv.Itoa(webHostPort)
	log.Println("Starting webrtc demo on port:", webHostPort, " tls:", useTls)
	//    1Dj9XZ5fwvKS6YoQZOoORcFnXaI=
	// log.Println("hmac:", Hmac("my_secret", "1433895918506:my_user_name"))
	if useTls {
		config := &tls.Config{
			// Only allow ciphers that support forward secrecy for iOS9 compatibility:
			// https://developer.apple.com/library/prerelease/ios/technotes/App-Transport-Security-Technote/
			CipherSuites: []uint16{
				tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
				tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
				tls.TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA,
				tls.TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA,
				tls.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA,
			},
			PreferServerCipherSuites: true,
		}
		server := &http.Server{Addr: pstr, Handler: WebServeMux, TLSConfig: config}

		e = server.ListenAndServeTLS(*CERT, *KEY)
	} else {
		e = http.ListenAndServe(pstr, WebServeMux)
	}

	if e != nil {
		log.Fatal("Run: " + e.Error())
	}
	// http.ListenAndServe(":8888", nil)

}
