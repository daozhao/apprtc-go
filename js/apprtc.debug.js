(function(f) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = f();
  } else {
    if (typeof define === "function" && define.amd) {
      define([], f);
    } else {
      var g;
      if (typeof window !== "undefined") {
        g = window;
      } else {
        if (typeof global !== "undefined") {
          g = global;
        } else {
          if (typeof self !== "undefined") {
            g = self;
          } else {
            g = this;
          }
        }
      }
      g.adapter = f();
    }
  }
})(function() {
  var define, module, exports;
  return function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          var a = typeof require == "function" && require;
          if (!u && a) {
            return a(o, !0);
          }
          if (i) {
            return i(o, !0);
          }
          var f = new Error("Cannot find module '" + o + "'");
          throw f.code = "MODULE_NOT_FOUND", f;
        }
        var l = n[o] = {exports:{}};
        t[o][0].call(l.exports, function(e) {
          var n = t[o][1][e];
          return s(n ? n : e);
        }, l, l.exports, e, t, n, r);
      }
      return n[o].exports;
    }
    var i = typeof require == "function" && require;
    for (var o = 0;o < r.length;o++) {
      s(r[o]);
    }
    return s;
  }({1:[function(require, module, exports) {
    var SDPUtils = {};
    SDPUtils.generateIdentifier = function() {
      return Math.random().toString(36).substr(2, 10);
    };
    SDPUtils.localCName = SDPUtils.generateIdentifier();
    SDPUtils.splitLines = function(blob) {
      return blob.trim().split("\n").map(function(line) {
        return line.trim();
      });
    };
    SDPUtils.splitSections = function(blob) {
      var parts = blob.split("\nm=");
      return parts.map(function(part, index) {
        return (index > 0 ? "m=" + part : part).trim() + "\r\n";
      });
    };
    SDPUtils.matchPrefix = function(blob, prefix) {
      return SDPUtils.splitLines(blob).filter(function(line) {
        return line.indexOf(prefix) === 0;
      });
    };
    SDPUtils.parseCandidate = function(line) {
      var parts;
      if (line.indexOf("a=candidate:") === 0) {
        parts = line.substring(12).split(" ");
      } else {
        parts = line.substring(10).split(" ");
      }
      var candidate = {foundation:parts[0], component:parts[1], protocol:parts[2].toLowerCase(), priority:parseInt(parts[3], 10), ip:parts[4], port:parseInt(parts[5], 10), type:parts[7]};
      for (var i = 8;i < parts.length;i += 2) {
        switch(parts[i]) {
          case "raddr":
            candidate.relatedAddress = parts[i + 1];
            break;
          case "rport":
            candidate.relatedPort = parseInt(parts[i + 1], 10);
            break;
          case "tcptype":
            candidate.tcpType = parts[i + 1];
            break;
          default:
            break;
        }
      }
      return candidate;
    };
    SDPUtils.writeCandidate = function(candidate) {
      var sdp = [];
      sdp.push(candidate.foundation);
      sdp.push(candidate.component);
      sdp.push(candidate.protocol.toUpperCase());
      sdp.push(candidate.priority);
      sdp.push(candidate.ip);
      sdp.push(candidate.port);
      var type = candidate.type;
      sdp.push("typ");
      sdp.push(type);
      if (type !== "host" && candidate.relatedAddress && candidate.relatedPort) {
        sdp.push("raddr");
        sdp.push(candidate.relatedAddress);
        sdp.push("rport");
        sdp.push(candidate.relatedPort);
      }
      if (candidate.tcpType && candidate.protocol.toLowerCase() === "tcp") {
        sdp.push("tcptype");
        sdp.push(candidate.tcpType);
      }
      return "candidate:" + sdp.join(" ");
    };
    SDPUtils.parseRtpMap = function(line) {
      var parts = line.substr(9).split(" ");
      var parsed = {payloadType:parseInt(parts.shift(), 10)};
      parts = parts[0].split("/");
      parsed.name = parts[0];
      parsed.clockRate = parseInt(parts[1], 10);
      parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
      return parsed;
    };
    SDPUtils.writeRtpMap = function(codec) {
      var pt = codec.payloadType;
      if (codec.preferredPayloadType !== undefined) {
        pt = codec.preferredPayloadType;
      }
      return "a=rtpmap:" + pt + " " + codec.name + "/" + codec.clockRate + (codec.numChannels !== 1 ? "/" + codec.numChannels : "") + "\r\n";
    };
    SDPUtils.parseExtmap = function(line) {
      var parts = line.substr(9).split(" ");
      return {id:parseInt(parts[0], 10), uri:parts[1]};
    };
    SDPUtils.writeExtmap = function(headerExtension) {
      return "a=extmap:" + (headerExtension.id || headerExtension.preferredId) + " " + headerExtension.uri + "\r\n";
    };
    SDPUtils.parseFmtp = function(line) {
      var parsed = {};
      var kv;
      var parts = line.substr(line.indexOf(" ") + 1).split(";");
      for (var j = 0;j < parts.length;j++) {
        kv = parts[j].trim().split("=");
        parsed[kv[0].trim()] = kv[1];
      }
      return parsed;
    };
    SDPUtils.writeFmtp = function(codec) {
      var line = "";
      var pt = codec.payloadType;
      if (codec.preferredPayloadType !== undefined) {
        pt = codec.preferredPayloadType;
      }
      if (codec.parameters && Object.keys(codec.parameters).length) {
        var params = [];
        Object.keys(codec.parameters).forEach(function(param) {
          params.push(param + "=" + codec.parameters[param]);
        });
        line += "a=fmtp:" + pt + " " + params.join(";") + "\r\n";
      }
      return line;
    };
    SDPUtils.parseRtcpFb = function(line) {
      var parts = line.substr(line.indexOf(" ") + 1).split(" ");
      return {type:parts.shift(), parameter:parts.join(" ")};
    };
    SDPUtils.writeRtcpFb = function(codec) {
      var lines = "";
      var pt = codec.payloadType;
      if (codec.preferredPayloadType !== undefined) {
        pt = codec.preferredPayloadType;
      }
      if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
        codec.rtcpFeedback.forEach(function(fb) {
          lines += "a=rtcp-fb:" + pt + " " + fb.type + (fb.parameter && fb.parameter.length ? " " + fb.parameter : "") + "\r\n";
        });
      }
      return lines;
    };
    SDPUtils.parseSsrcMedia = function(line) {
      var sp = line.indexOf(" ");
      var parts = {ssrc:parseInt(line.substr(7, sp - 7), 10)};
      var colon = line.indexOf(":", sp);
      if (colon > -1) {
        parts.attribute = line.substr(sp + 1, colon - sp - 1);
        parts.value = line.substr(colon + 1);
      } else {
        parts.attribute = line.substr(sp + 1);
      }
      return parts;
    };
    SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
      var lines = SDPUtils.splitLines(mediaSection);
      lines = lines.concat(SDPUtils.splitLines(sessionpart));
      var fpLine = lines.filter(function(line) {
        return line.indexOf("a=fingerprint:") === 0;
      })[0].substr(14);
      var dtlsParameters = {role:"auto", fingerprints:[{algorithm:fpLine.split(" ")[0], value:fpLine.split(" ")[1]}]};
      return dtlsParameters;
    };
    SDPUtils.writeDtlsParameters = function(params, setupType) {
      var sdp = "a=setup:" + setupType + "\r\n";
      params.fingerprints.forEach(function(fp) {
        sdp += "a=fingerprint:" + fp.algorithm + " " + fp.value + "\r\n";
      });
      return sdp;
    };
    SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
      var lines = SDPUtils.splitLines(mediaSection);
      lines = lines.concat(SDPUtils.splitLines(sessionpart));
      var iceParameters = {usernameFragment:lines.filter(function(line) {
        return line.indexOf("a=ice-ufrag:") === 0;
      })[0].substr(12), password:lines.filter(function(line) {
        return line.indexOf("a=ice-pwd:") === 0;
      })[0].substr(10)};
      return iceParameters;
    };
    SDPUtils.writeIceParameters = function(params) {
      return "a=ice-ufrag:" + params.usernameFragment + "\r\n" + "a=ice-pwd:" + params.password + "\r\n";
    };
    SDPUtils.parseRtpParameters = function(mediaSection) {
      var description = {codecs:[], headerExtensions:[], fecMechanisms:[], rtcp:[]};
      var lines = SDPUtils.splitLines(mediaSection);
      var mline = lines[0].split(" ");
      for (var i = 3;i < mline.length;i++) {
        var pt = mline[i];
        var rtpmapline = SDPUtils.matchPrefix(mediaSection, "a=rtpmap:" + pt + " ")[0];
        if (rtpmapline) {
          var codec = SDPUtils.parseRtpMap(rtpmapline);
          var fmtps = SDPUtils.matchPrefix(mediaSection, "a=fmtp:" + pt + " ");
          codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
          codec.rtcpFeedback = SDPUtils.matchPrefix(mediaSection, "a=rtcp-fb:" + pt + " ").map(SDPUtils.parseRtcpFb);
          description.codecs.push(codec);
          switch(codec.name.toUpperCase()) {
            case "RED":
            case "ULPFEC":
              description.fecMechanisms.push(codec.name.toUpperCase());
              break;
            default:
              break;
          }
        }
      }
      SDPUtils.matchPrefix(mediaSection, "a=extmap:").forEach(function(line) {
        description.headerExtensions.push(SDPUtils.parseExtmap(line));
      });
      return description;
    };
    SDPUtils.writeRtpDescription = function(kind, caps) {
      var sdp = "";
      sdp += "m=" + kind + " ";
      sdp += caps.codecs.length > 0 ? "9" : "0";
      sdp += " UDP/TLS/RTP/SAVPF ";
      sdp += caps.codecs.map(function(codec) {
        if (codec.preferredPayloadType !== undefined) {
          return codec.preferredPayloadType;
        }
        return codec.payloadType;
      }).join(" ") + "\r\n";
      sdp += "c=IN IP4 0.0.0.0\r\n";
      sdp += "a=rtcp:9 IN IP4 0.0.0.0\r\n";
      caps.codecs.forEach(function(codec) {
        sdp += SDPUtils.writeRtpMap(codec);
        sdp += SDPUtils.writeFmtp(codec);
        sdp += SDPUtils.writeRtcpFb(codec);
      });
      sdp += "a=rtcp-mux\r\n";
      return sdp;
    };
    SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
      var encodingParameters = [];
      var description = SDPUtils.parseRtpParameters(mediaSection);
      var hasRed = description.fecMechanisms.indexOf("RED") !== -1;
      var hasUlpfec = description.fecMechanisms.indexOf("ULPFEC") !== -1;
      var ssrcs = SDPUtils.matchPrefix(mediaSection, "a=ssrc:").map(function(line) {
        return SDPUtils.parseSsrcMedia(line);
      }).filter(function(parts) {
        return parts.attribute === "cname";
      });
      var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
      var secondarySsrc;
      var flows = SDPUtils.matchPrefix(mediaSection, "a=ssrc-group:FID").map(function(line) {
        var parts = line.split(" ");
        parts.shift();
        return parts.map(function(part) {
          return parseInt(part, 10);
        });
      });
      if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
        secondarySsrc = flows[0][1];
      }
      description.codecs.forEach(function(codec) {
        if (codec.name.toUpperCase() === "RTX" && codec.parameters.apt) {
          var encParam = {ssrc:primarySsrc, codecPayloadType:parseInt(codec.parameters.apt, 10), rtx:{payloadType:codec.payloadType, ssrc:secondarySsrc}};
          encodingParameters.push(encParam);
          if (hasRed) {
            encParam = JSON.parse(JSON.stringify(encParam));
            encParam.fec = {ssrc:secondarySsrc, mechanism:hasUlpfec ? "red+ulpfec" : "red"};
            encodingParameters.push(encParam);
          }
        }
      });
      if (encodingParameters.length === 0 && primarySsrc) {
        encodingParameters.push({ssrc:primarySsrc});
      }
      var bandwidth = SDPUtils.matchPrefix(mediaSection, "b=");
      if (bandwidth.length) {
        if (bandwidth[0].indexOf("b=TIAS:") === 0) {
          bandwidth = parseInt(bandwidth[0].substr(7), 10);
        } else {
          if (bandwidth[0].indexOf("b=AS:") === 0) {
            bandwidth = parseInt(bandwidth[0].substr(5), 10);
          }
        }
        encodingParameters.forEach(function(params) {
          params.maxBitrate = bandwidth;
        });
      }
      return encodingParameters;
    };
    SDPUtils.writeSessionBoilerplate = function() {
      return "v=0\r\n" + "o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n" + "s=-\r\n" + "t=0 0\r\n";
    };
    SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
      var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);
      sdp += SDPUtils.writeIceParameters(transceiver.iceGatherer.getLocalParameters());
      sdp += SDPUtils.writeDtlsParameters(transceiver.dtlsTransport.getLocalParameters(), type === "offer" ? "actpass" : "active");
      sdp += "a=mid:" + transceiver.mid + "\r\n";
      if (transceiver.rtpSender && transceiver.rtpReceiver) {
        sdp += "a=sendrecv\r\n";
      } else {
        if (transceiver.rtpSender) {
          sdp += "a=sendonly\r\n";
        } else {
          if (transceiver.rtpReceiver) {
            sdp += "a=recvonly\r\n";
          } else {
            sdp += "a=inactive\r\n";
          }
        }
      }
      if (transceiver.rtpSender) {
        var msid = "msid:" + stream.id + " " + transceiver.rtpSender.track.id + "\r\n";
        sdp += "a=" + msid;
        sdp += "a=ssrc:" + transceiver.sendEncodingParameters[0].ssrc + " " + msid;
      }
      sdp += "a=ssrc:" + transceiver.sendEncodingParameters[0].ssrc + " cname:" + SDPUtils.localCName + "\r\n";
      return sdp;
    };
    SDPUtils.getDirection = function(mediaSection, sessionpart) {
      var lines = SDPUtils.splitLines(mediaSection);
      for (var i = 0;i < lines.length;i++) {
        switch(lines[i]) {
          case "a=sendrecv":
          case "a=sendonly":
          case "a=recvonly":
          case "a=inactive":
            return lines[i].substr(2);
          default:
        }
      }
      if (sessionpart) {
        return SDPUtils.getDirection(sessionpart);
      }
      return "sendrecv";
    };
    module.exports = SDPUtils;
  }, {}], 2:[function(require, module, exports) {
    (function() {
      var logging = require("./utils").log;
      var browserDetails = require("./utils").browserDetails;
      module.exports.browserDetails = browserDetails;
      module.exports.extractVersion = require("./utils").extractVersion;
      module.exports.disableLog = require("./utils").disableLog;
      var chromeShim = require("./chrome/chrome_shim") || null;
      var edgeShim = require("./edge/edge_shim") || null;
      var firefoxShim = require("./firefox/firefox_shim") || null;
      var safariShim = require("./safari/safari_shim") || null;
      switch(browserDetails.browser) {
        case "opera":
        case "chrome":
          if (!chromeShim || !chromeShim.shimPeerConnection) {
            logging("Chrome shim is not included in this adapter release.");
            return;
          }
          logging("adapter.js shimming chrome.");
          module.exports.browserShim = chromeShim;
          chromeShim.shimGetUserMedia();
          chromeShim.shimMediaStream();
          chromeShim.shimSourceObject();
          chromeShim.shimPeerConnection();
          chromeShim.shimOnTrack();
          break;
        case "firefox":
          if (!firefoxShim || !firefoxShim.shimPeerConnection) {
            logging("Firefox shim is not included in this adapter release.");
            return;
          }
          logging("adapter.js shimming firefox.");
          module.exports.browserShim = firefoxShim;
          firefoxShim.shimGetUserMedia();
          firefoxShim.shimSourceObject();
          firefoxShim.shimPeerConnection();
          firefoxShim.shimOnTrack();
          break;
        case "edge":
          if (!edgeShim || !edgeShim.shimPeerConnection) {
            logging("MS edge shim is not included in this adapter release.");
            return;
          }
          logging("adapter.js shimming edge.");
          module.exports.browserShim = edgeShim;
          edgeShim.shimGetUserMedia();
          edgeShim.shimPeerConnection();
          break;
        case "safari":
          if (!safariShim) {
            logging("Safari shim is not included in this adapter release.");
            return;
          }
          logging("adapter.js shimming safari.");
          module.exports.browserShim = safariShim;
          safariShim.shimGetUserMedia();
          break;
        default:
          logging("Unsupported browser!");
      }
    })();
  }, {"./chrome/chrome_shim":3, "./edge/edge_shim":5, "./firefox/firefox_shim":7, "./safari/safari_shim":9, "./utils":10}], 3:[function(require, module, exports) {
    var logging = require("../utils.js").log;
    var browserDetails = require("../utils.js").browserDetails;
    var chromeShim = {shimMediaStream:function() {
      window.MediaStream = window.MediaStream || window.webkitMediaStream;
    }, shimOnTrack:function() {
      if (typeof window === "object" && window.RTCPeerConnection && !("ontrack" in window.RTCPeerConnection.prototype)) {
        Object.defineProperty(window.RTCPeerConnection.prototype, "ontrack", {get:function() {
          return this._ontrack;
        }, set:function(f) {
          var self = this;
          if (this._ontrack) {
            this.removeEventListener("track", this._ontrack);
            this.removeEventListener("addstream", this._ontrackpoly);
          }
          this.addEventListener("track", this._ontrack = f);
          this.addEventListener("addstream", this._ontrackpoly = function(e) {
            e.stream.addEventListener("addtrack", function(te) {
              var event = new Event("track");
              event.track = te.track;
              event.receiver = {track:te.track};
              event.streams = [e.stream];
              self.dispatchEvent(event);
            });
            e.stream.getTracks().forEach(function(track) {
              var event = new Event("track");
              event.track = track;
              event.receiver = {track:track};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }});
      }
    }, shimSourceObject:function() {
      if (typeof window === "object") {
        if (window.HTMLMediaElement && !("srcObject" in window.HTMLMediaElement.prototype)) {
          Object.defineProperty(window.HTMLMediaElement.prototype, "srcObject", {get:function() {
            return this._srcObject;
          }, set:function(stream) {
            var self = this;
            this._srcObject = stream;
            if (this.src) {
              URL.revokeObjectURL(this.src);
            }
            if (!stream) {
              this.src = "";
              return;
            }
            this.src = URL.createObjectURL(stream);
            stream.addEventListener("addtrack", function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
            stream.addEventListener("removetrack", function() {
              if (self.src) {
                URL.revokeObjectURL(self.src);
              }
              self.src = URL.createObjectURL(stream);
            });
          }});
        }
      }
    }, shimPeerConnection:function() {
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
        logging("PeerConnection");
        if (pcConfig && pcConfig.iceTransportPolicy) {
          pcConfig.iceTransports = pcConfig.iceTransportPolicy;
        }
        var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints);
        var origGetStats = pc.getStats.bind(pc);
        pc.getStats = function(selector, successCallback, errorCallback) {
          var self = this;
          var args = arguments;
          if (arguments.length > 0 && typeof selector === "function") {
            return origGetStats(selector, successCallback);
          }
          var fixChromeStats_ = function(response) {
            var standardReport = {};
            var reports = response.result();
            reports.forEach(function(report) {
              var standardStats = {id:report.id, timestamp:report.timestamp, type:report.type};
              report.names().forEach(function(name) {
                standardStats[name] = report.stat(name);
              });
              standardReport[standardStats.id] = standardStats;
            });
            return standardReport;
          };
          var makeMapStats = function(stats, legacyStats) {
            var map = new Map(Object.keys(stats).map(function(key) {
              return [key, stats[key]];
            }));
            legacyStats = legacyStats || stats;
            Object.keys(legacyStats).forEach(function(key) {
              map[key] = legacyStats[key];
            });
            return map;
          };
          if (arguments.length >= 2) {
            var successCallbackWrapper_ = function(response) {
              args[1](makeMapStats(fixChromeStats_(response)));
            };
            return origGetStats.apply(this, [successCallbackWrapper_, arguments[0]]);
          }
          return (new Promise(function(resolve, reject) {
            if (args.length === 1 && typeof selector === "object") {
              origGetStats.apply(self, [function(response) {
                resolve(makeMapStats(fixChromeStats_(response)));
              }, reject]);
            } else {
              origGetStats.apply(self, [function(response) {
                resolve(makeMapStats(fixChromeStats_(response), response.result()));
              }, reject]);
            }
          })).then(successCallback, errorCallback);
        };
        return pc;
      };
      window.RTCPeerConnection.prototype = webkitRTCPeerConnection.prototype;
      if (webkitRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, "generateCertificate", {get:function() {
          return webkitRTCPeerConnection.generateCertificate;
        }});
      }
      ["createOffer", "createAnswer"].forEach(function(method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function() {
          var self = this;
          if (arguments.length < 1 || arguments.length === 1 && typeof arguments[0] === "object") {
            var opts = arguments.length === 1 ? arguments[0] : undefined;
            return new Promise(function(resolve, reject) {
              nativeMethod.apply(self, [resolve, reject, opts]);
            });
          }
          return nativeMethod.apply(this, arguments);
        };
      });
      if (browserDetails.version < 51) {
        ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
          var nativeMethod = webkitRTCPeerConnection.prototype[method];
          webkitRTCPeerConnection.prototype[method] = function() {
            var args = arguments;
            var self = this;
            var promise = new Promise(function(resolve, reject) {
              nativeMethod.apply(self, [args[0], resolve, reject]);
            });
            if (args.length < 2) {
              return promise;
            }
            return promise.then(function() {
              args[1].apply(null, []);
            }, function(err) {
              if (args.length >= 3) {
                args[2].apply(null, [err]);
              }
            });
          };
        });
      }
      ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function() {
          arguments[0] = new (method === "addIceCandidate" ? RTCIceCandidate : RTCSessionDescription)(arguments[0]);
          return nativeMethod.apply(this, arguments);
        };
      });
      var nativeAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
      RTCPeerConnection.prototype.addIceCandidate = function() {
        if (!arguments[0]) {
          if (arguments[1]) {
            arguments[1].apply(null);
          }
          return Promise.resolve();
        }
        return nativeAddIceCandidate.apply(this, arguments);
      };
    }};
    module.exports = {shimMediaStream:chromeShim.shimMediaStream, shimOnTrack:chromeShim.shimOnTrack, shimSourceObject:chromeShim.shimSourceObject, shimPeerConnection:chromeShim.shimPeerConnection, shimGetUserMedia:require("./getusermedia")};
  }, {"../utils.js":10, "./getusermedia":4}], 4:[function(require, module, exports) {
    var logging = require("../utils.js").log;
    module.exports = function() {
      var constraintsToChrome_ = function(c) {
        if (typeof c !== "object" || c.mandatory || c.optional) {
          return c;
        }
        var cc = {};
        Object.keys(c).forEach(function(key) {
          if (key === "require" || key === "advanced" || key === "mediaSource") {
            return;
          }
          var r = typeof c[key] === "object" ? c[key] : {ideal:c[key]};
          if (r.exact !== undefined && typeof r.exact === "number") {
            r.min = r.max = r.exact;
          }
          var oldname_ = function(prefix, name) {
            if (prefix) {
              return prefix + name.charAt(0).toUpperCase() + name.slice(1);
            }
            return name === "deviceId" ? "sourceId" : name;
          };
          if (r.ideal !== undefined) {
            cc.optional = cc.optional || [];
            var oc = {};
            if (typeof r.ideal === "number") {
              oc[oldname_("min", key)] = r.ideal;
              cc.optional.push(oc);
              oc = {};
              oc[oldname_("max", key)] = r.ideal;
              cc.optional.push(oc);
            } else {
              oc[oldname_("", key)] = r.ideal;
              cc.optional.push(oc);
            }
          }
          if (r.exact !== undefined && typeof r.exact !== "number") {
            cc.mandatory = cc.mandatory || {};
            cc.mandatory[oldname_("", key)] = r.exact;
          } else {
            ["min", "max"].forEach(function(mix) {
              if (r[mix] !== undefined) {
                cc.mandatory = cc.mandatory || {};
                cc.mandatory[oldname_(mix, key)] = r[mix];
              }
            });
          }
        });
        if (c.advanced) {
          cc.optional = (cc.optional || []).concat(c.advanced);
        }
        return cc;
      };
      var shimConstraints_ = function(constraints, func) {
        constraints = JSON.parse(JSON.stringify(constraints));
        if (constraints && constraints.audio) {
          constraints.audio = constraintsToChrome_(constraints.audio);
        }
        if (constraints && typeof constraints.video === "object") {
          var face = constraints.video.facingMode;
          face = face && (typeof face === "object" ? face : {ideal:face});
          if (face && (face.exact === "user" || face.exact === "environment" || face.ideal === "user" || face.ideal === "environment") && !(navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().facingMode)) {
            delete constraints.video.facingMode;
            if (face.exact === "environment" || face.ideal === "environment") {
              return navigator.mediaDevices.enumerateDevices().then(function(devices) {
                devices = devices.filter(function(d) {
                  return d.kind === "videoinput";
                });
                var back = devices.find(function(d) {
                  return d.label.toLowerCase().indexOf("back") !== -1;
                }) || devices.length && devices[devices.length - 1];
                if (back) {
                  constraints.video.deviceId = face.exact ? {exact:back.deviceId} : {ideal:back.deviceId};
                }
                constraints.video = constraintsToChrome_(constraints.video);
                logging("chrome: " + JSON.stringify(constraints));
                return func(constraints);
              });
            }
          }
          constraints.video = constraintsToChrome_(constraints.video);
        }
        logging("chrome: " + JSON.stringify(constraints));
        return func(constraints);
      };
      var shimError_ = function(e) {
        return {name:{PermissionDeniedError:"NotAllowedError", ConstraintNotSatisfiedError:"OverconstrainedError"}[e.name] || e.name, message:e.message, constraint:e.constraintName, toString:function() {
          return this.name + (this.message && ": ") + this.message;
        }};
      };
      var getUserMedia_ = function(constraints, onSuccess, onError) {
        shimConstraints_(constraints, function(c) {
          navigator.webkitGetUserMedia(c, onSuccess, function(e) {
            onError(shimError_(e));
          });
        });
      };
      navigator.getUserMedia = getUserMedia_;
      var getUserMediaPromise_ = function(constraints) {
        return new Promise(function(resolve, reject) {
          navigator.getUserMedia(constraints, resolve, reject);
        });
      };
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {getUserMedia:getUserMediaPromise_, enumerateDevices:function() {
          return new Promise(function(resolve) {
            var kinds = {audio:"audioinput", video:"videoinput"};
            return MediaStreamTrack.getSources(function(devices) {
              resolve(devices.map(function(device) {
                return {label:device.label, kind:kinds[device.kind], deviceId:device.id, groupId:""};
              }));
            });
          });
        }};
      }
      if (!navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
          return getUserMediaPromise_(constraints);
        };
      } else {
        var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function(cs) {
          return shimConstraints_(cs, function(c) {
            return origGetUserMedia(c).then(function(stream) {
              if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
                stream.getTracks().forEach(function(track) {
                  track.stop();
                });
                throw new DOMException("", "NotFoundError");
              }
              return stream;
            }, function(e) {
              return Promise.reject(shimError_(e));
            });
          });
        };
      }
      if (typeof navigator.mediaDevices.addEventListener === "undefined") {
        navigator.mediaDevices.addEventListener = function() {
          logging("Dummy mediaDevices.addEventListener called.");
        };
      }
      if (typeof navigator.mediaDevices.removeEventListener === "undefined") {
        navigator.mediaDevices.removeEventListener = function() {
          logging("Dummy mediaDevices.removeEventListener called.");
        };
      }
    };
  }, {"../utils.js":10}], 5:[function(require, module, exports) {
    var SDPUtils = require("sdp");
    var browserDetails = require("../utils").browserDetails;
    var edgeShim = {shimPeerConnection:function() {
      if (window.RTCIceGatherer) {
        if (!window.RTCIceCandidate) {
          window.RTCIceCandidate = function(args) {
            return args;
          };
        }
        if (!window.RTCSessionDescription) {
          window.RTCSessionDescription = function(args) {
            return args;
          };
        }
        var origMSTEnabled = Object.getOwnPropertyDescriptor(MediaStreamTrack.prototype, "enabled");
        Object.defineProperty(MediaStreamTrack.prototype, "enabled", {set:function(value) {
          origMSTEnabled.set.call(this, value);
          var ev = new Event("enabled");
          ev.enabled = value;
          this.dispatchEvent(ev);
        }});
      }
      window.RTCPeerConnection = function(config) {
        var self = this;
        var _eventTarget = document.createDocumentFragment();
        ["addEventListener", "removeEventListener", "dispatchEvent"].forEach(function(method) {
          self[method] = _eventTarget[method].bind(_eventTarget);
        });
        this.onicecandidate = null;
        this.onaddstream = null;
        this.ontrack = null;
        this.onremovestream = null;
        this.onsignalingstatechange = null;
        this.oniceconnectionstatechange = null;
        this.onnegotiationneeded = null;
        this.ondatachannel = null;
        this.localStreams = [];
        this.remoteStreams = [];
        this.getLocalStreams = function() {
          return self.localStreams;
        };
        this.getRemoteStreams = function() {
          return self.remoteStreams;
        };
        this.localDescription = new RTCSessionDescription({type:"", sdp:""});
        this.remoteDescription = new RTCSessionDescription({type:"", sdp:""});
        this.signalingState = "stable";
        this.iceConnectionState = "new";
        this.iceGatheringState = "new";
        this.iceOptions = {gatherPolicy:"all", iceServers:[]};
        if (config && config.iceTransportPolicy) {
          switch(config.iceTransportPolicy) {
            case "all":
            case "relay":
              this.iceOptions.gatherPolicy = config.iceTransportPolicy;
              break;
            case "none":
              throw new TypeError('iceTransportPolicy "none" not supported');
            default:
              break;
          }
        }
        this.usingBundle = config && config.bundlePolicy === "max-bundle";
        if (config && config.iceServers) {
          var iceServers = JSON.parse(JSON.stringify(config.iceServers));
          this.iceOptions.iceServers = iceServers.filter(function(server) {
            if (server && server.urls) {
              var urls = server.urls;
              if (typeof urls === "string") {
                urls = [urls];
              }
              urls = urls.filter(function(url) {
                return url.indexOf("turn:") === 0 && url.indexOf("transport=udp") !== -1 && url.indexOf("turn:[") === -1 || url.indexOf("stun:") === 0 && browserDetails.version >= 14393;
              })[0];
              return !!urls;
            }
            return false;
          });
        }
        this._config = config;
        this.transceivers = [];
        this._localIceCandidatesBuffer = [];
      };
      window.RTCPeerConnection.prototype._emitBufferedCandidates = function() {
        var self = this;
        var sections = SDPUtils.splitSections(self.localDescription.sdp);
        this._localIceCandidatesBuffer.forEach(function(event) {
          var end = !event.candidate || Object.keys(event.candidate).length === 0;
          if (end) {
            for (var j = 1;j < sections.length;j++) {
              if (sections[j].indexOf("\r\na=end-of-candidates\r\n") === -1) {
                sections[j] += "a=end-of-candidates\r\n";
              }
            }
          } else {
            if (event.candidate.candidate.indexOf("typ endOfCandidates") === -1) {
              sections[event.candidate.sdpMLineIndex + 1] += "a=" + event.candidate.candidate + "\r\n";
            }
          }
          self.localDescription.sdp = sections.join("");
          self.dispatchEvent(event);
          if (self.onicecandidate !== null) {
            self.onicecandidate(event);
          }
          if (!event.candidate && self.iceGatheringState !== "complete") {
            var complete = self.transceivers.every(function(transceiver) {
              return transceiver.iceGatherer && transceiver.iceGatherer.state === "completed";
            });
            if (complete) {
              self.iceGatheringState = "complete";
            }
          }
        });
        this._localIceCandidatesBuffer = [];
      };
      window.RTCPeerConnection.prototype.getConfiguration = function() {
        return this._config;
      };
      window.RTCPeerConnection.prototype.addStream = function(stream) {
        var clonedStream = stream.clone();
        stream.getTracks().forEach(function(track, idx) {
          var clonedTrack = clonedStream.getTracks()[idx];
          track.addEventListener("enabled", function(event) {
            clonedTrack.enabled = event.enabled;
          });
        });
        this.localStreams.push(clonedStream);
        this._maybeFireNegotiationNeeded();
      };
      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        var idx = this.localStreams.indexOf(stream);
        if (idx > -1) {
          this.localStreams.splice(idx, 1);
          this._maybeFireNegotiationNeeded();
        }
      };
      window.RTCPeerConnection.prototype.getSenders = function() {
        return this.transceivers.filter(function(transceiver) {
          return !!transceiver.rtpSender;
        }).map(function(transceiver) {
          return transceiver.rtpSender;
        });
      };
      window.RTCPeerConnection.prototype.getReceivers = function() {
        return this.transceivers.filter(function(transceiver) {
          return !!transceiver.rtpReceiver;
        }).map(function(transceiver) {
          return transceiver.rtpReceiver;
        });
      };
      window.RTCPeerConnection.prototype._getCommonCapabilities = function(localCapabilities, remoteCapabilities) {
        var commonCapabilities = {codecs:[], headerExtensions:[], fecMechanisms:[]};
        localCapabilities.codecs.forEach(function(lCodec) {
          for (var i = 0;i < remoteCapabilities.codecs.length;i++) {
            var rCodec = remoteCapabilities.codecs[i];
            if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() && lCodec.clockRate === rCodec.clockRate) {
              rCodec.numChannels = Math.min(lCodec.numChannels, rCodec.numChannels);
              commonCapabilities.codecs.push(rCodec);
              rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
                for (var j = 0;j < lCodec.rtcpFeedback.length;j++) {
                  if (lCodec.rtcpFeedback[j].type === fb.type && lCodec.rtcpFeedback[j].parameter === fb.parameter) {
                    return true;
                  }
                }
                return false;
              });
              break;
            }
          }
        });
        localCapabilities.headerExtensions.forEach(function(lHeaderExtension) {
          for (var i = 0;i < remoteCapabilities.headerExtensions.length;i++) {
            var rHeaderExtension = remoteCapabilities.headerExtensions[i];
            if (lHeaderExtension.uri === rHeaderExtension.uri) {
              commonCapabilities.headerExtensions.push(rHeaderExtension);
              break;
            }
          }
        });
        return commonCapabilities;
      };
      window.RTCPeerConnection.prototype._createIceAndDtlsTransports = function(mid, sdpMLineIndex) {
        var self = this;
        var iceGatherer = new RTCIceGatherer(self.iceOptions);
        var iceTransport = new RTCIceTransport(iceGatherer);
        iceGatherer.onlocalcandidate = function(evt) {
          var event = new Event("icecandidate");
          event.candidate = {sdpMid:mid, sdpMLineIndex:sdpMLineIndex};
          var cand = evt.candidate;
          var end = !cand || Object.keys(cand).length === 0;
          if (end) {
            if (iceGatherer.state === undefined) {
              iceGatherer.state = "completed";
            }
            event.candidate.candidate = "candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates";
          } else {
            cand.component = iceTransport.component === "RTCP" ? 2 : 1;
            event.candidate.candidate = SDPUtils.writeCandidate(cand);
          }
          var sections = SDPUtils.splitSections(self.localDescription.sdp);
          if (event.candidate.candidate.indexOf("typ endOfCandidates") === -1) {
            sections[event.candidate.sdpMLineIndex + 1] += "a=" + event.candidate.candidate + "\r\n";
          } else {
            sections[event.candidate.sdpMLineIndex + 1] += "a=end-of-candidates\r\n";
          }
          self.localDescription.sdp = sections.join("");
          var complete = self.transceivers.every(function(transceiver) {
            return transceiver.iceGatherer && transceiver.iceGatherer.state === "completed";
          });
          switch(self.iceGatheringState) {
            case "new":
              self._localIceCandidatesBuffer.push(event);
              if (end && complete) {
                self._localIceCandidatesBuffer.push(new Event("icecandidate"));
              }
              break;
            case "gathering":
              self._emitBufferedCandidates();
              self.dispatchEvent(event);
              if (self.onicecandidate !== null) {
                self.onicecandidate(event);
              }
              if (complete) {
                self.dispatchEvent(new Event("icecandidate"));
                if (self.onicecandidate !== null) {
                  self.onicecandidate(new Event("icecandidate"));
                }
                self.iceGatheringState = "complete";
              }
              break;
            case "complete":
              break;
            default:
              break;
          }
        };
        iceTransport.onicestatechange = function() {
          self._updateConnectionState();
        };
        var dtlsTransport = new RTCDtlsTransport(iceTransport);
        dtlsTransport.ondtlsstatechange = function() {
          self._updateConnectionState();
        };
        dtlsTransport.onerror = function() {
          dtlsTransport.state = "failed";
          self._updateConnectionState();
        };
        return {iceGatherer:iceGatherer, iceTransport:iceTransport, dtlsTransport:dtlsTransport};
      };
      window.RTCPeerConnection.prototype._transceive = function(transceiver, send, recv) {
        var params = this._getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);
        if (send && transceiver.rtpSender) {
          params.encodings = transceiver.sendEncodingParameters;
          params.rtcp = {cname:SDPUtils.localCName};
          if (transceiver.recvEncodingParameters.length) {
            params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
          }
          transceiver.rtpSender.send(params);
        }
        if (recv && transceiver.rtpReceiver) {
          if (transceiver.kind === "video" && transceiver.recvEncodingParameters) {
            transceiver.recvEncodingParameters.forEach(function(p) {
              delete p.rtx;
            });
          }
          params.encodings = transceiver.recvEncodingParameters;
          params.rtcp = {cname:transceiver.cname};
          if (transceiver.sendEncodingParameters.length) {
            params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
          }
          transceiver.rtpReceiver.receive(params);
        }
      };
      window.RTCPeerConnection.prototype.setLocalDescription = function(description) {
        var self = this;
        var sections;
        var sessionpart;
        if (description.type === "offer") {
          if (this._pendingOffer) {
            sections = SDPUtils.splitSections(description.sdp);
            sessionpart = sections.shift();
            sections.forEach(function(mediaSection, sdpMLineIndex) {
              var caps = SDPUtils.parseRtpParameters(mediaSection);
              self._pendingOffer[sdpMLineIndex].localCapabilities = caps;
            });
            this.transceivers = this._pendingOffer;
            delete this._pendingOffer;
          }
        } else {
          if (description.type === "answer") {
            sections = SDPUtils.splitSections(self.remoteDescription.sdp);
            sessionpart = sections.shift();
            var isIceLite = SDPUtils.matchPrefix(sessionpart, "a=ice-lite").length > 0;
            sections.forEach(function(mediaSection, sdpMLineIndex) {
              var transceiver = self.transceivers[sdpMLineIndex];
              var iceGatherer = transceiver.iceGatherer;
              var iceTransport = transceiver.iceTransport;
              var dtlsTransport = transceiver.dtlsTransport;
              var localCapabilities = transceiver.localCapabilities;
              var remoteCapabilities = transceiver.remoteCapabilities;
              var rejected = mediaSection.split("\n", 1)[0].split(" ", 2)[1] === "0";
              if (!rejected && !transceiver.isDatachannel) {
                var remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
                if (isIceLite) {
                  var cands = SDPUtils.matchPrefix(mediaSection, "a=candidate:").map(function(cand) {
                    return SDPUtils.parseCandidate(cand);
                  }).filter(function(cand) {
                    return cand.component === "1";
                  });
                  if (cands.length) {
                    iceTransport.setRemoteCandidates(cands);
                  }
                }
                var remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
                if (isIceLite) {
                  remoteDtlsParameters.role = "server";
                }
                if (!self.usingBundle || sdpMLineIndex === 0) {
                  iceTransport.start(iceGatherer, remoteIceParameters, isIceLite ? "controlling" : "controlled");
                  dtlsTransport.start(remoteDtlsParameters);
                }
                var params = self._getCommonCapabilities(localCapabilities, remoteCapabilities);
                self._transceive(transceiver, params.codecs.length > 0, false);
              }
            });
          }
        }
        this.localDescription = {type:description.type, sdp:description.sdp};
        switch(description.type) {
          case "offer":
            this._updateSignalingState("have-local-offer");
            break;
          case "answer":
            this._updateSignalingState("stable");
            break;
          default:
            throw new TypeError('unsupported type "' + description.type + '"');
        }
        var hasCallback = arguments.length > 1 && typeof arguments[1] === "function";
        if (hasCallback) {
          var cb = arguments[1];
          window.setTimeout(function() {
            cb();
            if (self.iceGatheringState === "new") {
              self.iceGatheringState = "gathering";
            }
            self._emitBufferedCandidates();
          }, 0);
        }
        var p = Promise.resolve();
        p.then(function() {
          if (!hasCallback) {
            if (self.iceGatheringState === "new") {
              self.iceGatheringState = "gathering";
            }
            window.setTimeout(self._emitBufferedCandidates.bind(self), 500);
          }
        });
        return p;
      };
      window.RTCPeerConnection.prototype.setRemoteDescription = function(description) {
        var self = this;
        var stream = new MediaStream;
        var receiverList = [];
        var sections = SDPUtils.splitSections(description.sdp);
        var sessionpart = sections.shift();
        var isIceLite = SDPUtils.matchPrefix(sessionpart, "a=ice-lite").length > 0;
        this.usingBundle = SDPUtils.matchPrefix(sessionpart, "a=group:BUNDLE ").length > 0;
        sections.forEach(function(mediaSection, sdpMLineIndex) {
          var lines = SDPUtils.splitLines(mediaSection);
          var mline = lines[0].substr(2).split(" ");
          var kind = mline[0];
          var rejected = mline[1] === "0";
          var direction = SDPUtils.getDirection(mediaSection, sessionpart);
          var mid = SDPUtils.matchPrefix(mediaSection, "a=mid:");
          if (mid.length) {
            mid = mid[0].substr(6);
          } else {
            mid = SDPUtils.generateIdentifier();
          }
          if (kind === "application" && mline[2] === "DTLS/SCTP") {
            self.transceivers[sdpMLineIndex] = {mid:mid, isDatachannel:true};
            return;
          }
          var transceiver;
          var iceGatherer;
          var iceTransport;
          var dtlsTransport;
          var rtpSender;
          var rtpReceiver;
          var sendEncodingParameters;
          var recvEncodingParameters;
          var localCapabilities;
          var track;
          var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
          var remoteIceParameters;
          var remoteDtlsParameters;
          if (!rejected) {
            remoteIceParameters = SDPUtils.getIceParameters(mediaSection, sessionpart);
            remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection, sessionpart);
            remoteDtlsParameters.role = "client";
          }
          recvEncodingParameters = SDPUtils.parseRtpEncodingParameters(mediaSection);
          var cname;
          var remoteSsrc = SDPUtils.matchPrefix(mediaSection, "a=ssrc:").map(function(line) {
            return SDPUtils.parseSsrcMedia(line);
          }).filter(function(obj) {
            return obj.attribute === "cname";
          })[0];
          if (remoteSsrc) {
            cname = remoteSsrc.value;
          }
          var isComplete = SDPUtils.matchPrefix(mediaSection, "a=end-of-candidates", sessionpart).length > 0;
          var cands = SDPUtils.matchPrefix(mediaSection, "a=candidate:").map(function(cand) {
            return SDPUtils.parseCandidate(cand);
          }).filter(function(cand) {
            return cand.component === "1";
          });
          if (description.type === "offer" && !rejected) {
            var transports = self.usingBundle && sdpMLineIndex > 0 ? {iceGatherer:self.transceivers[0].iceGatherer, iceTransport:self.transceivers[0].iceTransport, dtlsTransport:self.transceivers[0].dtlsTransport} : self._createIceAndDtlsTransports(mid, sdpMLineIndex);
            if (isComplete) {
              transports.iceTransport.setRemoteCandidates(cands);
            }
            localCapabilities = RTCRtpReceiver.getCapabilities(kind);
            localCapabilities.codecs = localCapabilities.codecs.filter(function(codec) {
              return codec.name !== "rtx";
            });
            sendEncodingParameters = [{ssrc:(2 * sdpMLineIndex + 2) * 1001}];
            rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
            track = rtpReceiver.track;
            receiverList.push([track, rtpReceiver]);
            stream.addTrack(track);
            if (self.localStreams.length > 0 && self.localStreams[0].getTracks().length >= sdpMLineIndex) {
              var localTrack;
              if (kind === "audio") {
                localTrack = self.localStreams[0].getAudioTracks()[0];
              } else {
                if (kind === "video") {
                  localTrack = self.localStreams[0].getVideoTracks()[0];
                }
              }
              if (localTrack) {
                rtpSender = new RTCRtpSender(localTrack, transports.dtlsTransport);
              }
            }
            self.transceivers[sdpMLineIndex] = {iceGatherer:transports.iceGatherer, iceTransport:transports.iceTransport, dtlsTransport:transports.dtlsTransport, localCapabilities:localCapabilities, remoteCapabilities:remoteCapabilities, rtpSender:rtpSender, rtpReceiver:rtpReceiver, kind:kind, mid:mid, cname:cname, sendEncodingParameters:sendEncodingParameters, recvEncodingParameters:recvEncodingParameters};
            self._transceive(self.transceivers[sdpMLineIndex], false, direction === "sendrecv" || direction === "sendonly");
          } else {
            if (description.type === "answer" && !rejected) {
              transceiver = self.transceivers[sdpMLineIndex];
              iceGatherer = transceiver.iceGatherer;
              iceTransport = transceiver.iceTransport;
              dtlsTransport = transceiver.dtlsTransport;
              rtpSender = transceiver.rtpSender;
              rtpReceiver = transceiver.rtpReceiver;
              sendEncodingParameters = transceiver.sendEncodingParameters;
              localCapabilities = transceiver.localCapabilities;
              self.transceivers[sdpMLineIndex].recvEncodingParameters = recvEncodingParameters;
              self.transceivers[sdpMLineIndex].remoteCapabilities = remoteCapabilities;
              self.transceivers[sdpMLineIndex].cname = cname;
              if ((isIceLite || isComplete) && cands.length) {
                iceTransport.setRemoteCandidates(cands);
              }
              if (!self.usingBundle || sdpMLineIndex === 0) {
                iceTransport.start(iceGatherer, remoteIceParameters, "controlling");
                dtlsTransport.start(remoteDtlsParameters);
              }
              self._transceive(transceiver, direction === "sendrecv" || direction === "recvonly", direction === "sendrecv" || direction === "sendonly");
              if (rtpReceiver && (direction === "sendrecv" || direction === "sendonly")) {
                track = rtpReceiver.track;
                receiverList.push([track, rtpReceiver]);
                stream.addTrack(track);
              } else {
                delete transceiver.rtpReceiver;
              }
            }
          }
        });
        this.remoteDescription = {type:description.type, sdp:description.sdp};
        switch(description.type) {
          case "offer":
            this._updateSignalingState("have-remote-offer");
            break;
          case "answer":
            this._updateSignalingState("stable");
            break;
          default:
            throw new TypeError('unsupported type "' + description.type + '"');
        }
        if (stream.getTracks().length) {
          self.remoteStreams.push(stream);
          window.setTimeout(function() {
            var event = new Event("addstream");
            event.stream = stream;
            self.dispatchEvent(event);
            if (self.onaddstream !== null) {
              window.setTimeout(function() {
                self.onaddstream(event);
              }, 0);
            }
            receiverList.forEach(function(item) {
              var track = item[0];
              var receiver = item[1];
              var trackEvent = new Event("track");
              trackEvent.track = track;
              trackEvent.receiver = receiver;
              trackEvent.streams = [stream];
              self.dispatchEvent(event);
              if (self.ontrack !== null) {
                window.setTimeout(function() {
                  self.ontrack(trackEvent);
                }, 0);
              }
            });
          }, 0);
        }
        if (arguments.length > 1 && typeof arguments[1] === "function") {
          window.setTimeout(arguments[1], 0);
        }
        return Promise.resolve();
      };
      window.RTCPeerConnection.prototype.close = function() {
        this.transceivers.forEach(function(transceiver) {
          if (transceiver.iceTransport) {
            transceiver.iceTransport.stop();
          }
          if (transceiver.dtlsTransport) {
            transceiver.dtlsTransport.stop();
          }
          if (transceiver.rtpSender) {
            transceiver.rtpSender.stop();
          }
          if (transceiver.rtpReceiver) {
            transceiver.rtpReceiver.stop();
          }
        });
        this._updateSignalingState("closed");
      };
      window.RTCPeerConnection.prototype._updateSignalingState = function(newState) {
        this.signalingState = newState;
        var event = new Event("signalingstatechange");
        this.dispatchEvent(event);
        if (this.onsignalingstatechange !== null) {
          this.onsignalingstatechange(event);
        }
      };
      window.RTCPeerConnection.prototype._maybeFireNegotiationNeeded = function() {
        var event = new Event("negotiationneeded");
        this.dispatchEvent(event);
        if (this.onnegotiationneeded !== null) {
          this.onnegotiationneeded(event);
        }
      };
      window.RTCPeerConnection.prototype._updateConnectionState = function() {
        var self = this;
        var newState;
        var states = {"new":0, closed:0, connecting:0, checking:0, connected:0, completed:0, failed:0};
        this.transceivers.forEach(function(transceiver) {
          states[transceiver.iceTransport.state]++;
          states[transceiver.dtlsTransport.state]++;
        });
        states.connected += states.completed;
        newState = "new";
        if (states.failed > 0) {
          newState = "failed";
        } else {
          if (states.connecting > 0 || states.checking > 0) {
            newState = "connecting";
          } else {
            if (states.disconnected > 0) {
              newState = "disconnected";
            } else {
              if (states["new"] > 0) {
                newState = "new";
              } else {
                if (states.connected > 0 || states.completed > 0) {
                  newState = "connected";
                }
              }
            }
          }
        }
        if (newState !== self.iceConnectionState) {
          self.iceConnectionState = newState;
          var event = new Event("iceconnectionstatechange");
          this.dispatchEvent(event);
          if (this.oniceconnectionstatechange !== null) {
            this.oniceconnectionstatechange(event);
          }
        }
      };
      window.RTCPeerConnection.prototype.createOffer = function() {
        var self = this;
        if (this._pendingOffer) {
          throw new Error("createOffer called while there is a pending offer.");
        }
        var offerOptions;
        if (arguments.length === 1 && typeof arguments[0] !== "function") {
          offerOptions = arguments[0];
        } else {
          if (arguments.length === 3) {
            offerOptions = arguments[2];
          }
        }
        var tracks = [];
        var numAudioTracks = 0;
        var numVideoTracks = 0;
        if (this.localStreams.length) {
          numAudioTracks = this.localStreams[0].getAudioTracks().length;
          numVideoTracks = this.localStreams[0].getVideoTracks().length;
        }
        if (offerOptions) {
          if (offerOptions.mandatory || offerOptions.optional) {
            throw new TypeError("Legacy mandatory/optional constraints not supported.");
          }
          if (offerOptions.offerToReceiveAudio !== undefined) {
            numAudioTracks = offerOptions.offerToReceiveAudio;
          }
          if (offerOptions.offerToReceiveVideo !== undefined) {
            numVideoTracks = offerOptions.offerToReceiveVideo;
          }
        }
        if (this.localStreams.length) {
          this.localStreams[0].getTracks().forEach(function(track) {
            tracks.push({kind:track.kind, track:track, wantReceive:track.kind === "audio" ? numAudioTracks > 0 : numVideoTracks > 0});
            if (track.kind === "audio") {
              numAudioTracks--;
            } else {
              if (track.kind === "video") {
                numVideoTracks--;
              }
            }
          });
        }
        while (numAudioTracks > 0 || numVideoTracks > 0) {
          if (numAudioTracks > 0) {
            tracks.push({kind:"audio", wantReceive:true});
            numAudioTracks--;
          }
          if (numVideoTracks > 0) {
            tracks.push({kind:"video", wantReceive:true});
            numVideoTracks--;
          }
        }
        var sdp = SDPUtils.writeSessionBoilerplate();
        var transceivers = [];
        tracks.forEach(function(mline, sdpMLineIndex) {
          var track = mline.track;
          var kind = mline.kind;
          var mid = SDPUtils.generateIdentifier();
          var transports = self.usingBundle && sdpMLineIndex > 0 ? {iceGatherer:transceivers[0].iceGatherer, iceTransport:transceivers[0].iceTransport, dtlsTransport:transceivers[0].dtlsTransport} : self._createIceAndDtlsTransports(mid, sdpMLineIndex);
          var localCapabilities = RTCRtpSender.getCapabilities(kind);
          localCapabilities.codecs = localCapabilities.codecs.filter(function(codec) {
            return codec.name !== "rtx";
          });
          localCapabilities.codecs.forEach(function(codec) {
            if (codec.name === "H264" && codec.parameters["level-asymmetry-allowed"] === undefined) {
              codec.parameters["level-asymmetry-allowed"] = "1";
            }
          });
          var rtpSender;
          var rtpReceiver;
          var sendEncodingParameters = [{ssrc:(2 * sdpMLineIndex + 1) * 1001}];
          if (track) {
            rtpSender = new RTCRtpSender(track, transports.dtlsTransport);
          }
          if (mline.wantReceive) {
            rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
          }
          transceivers[sdpMLineIndex] = {iceGatherer:transports.iceGatherer, iceTransport:transports.iceTransport, dtlsTransport:transports.dtlsTransport, localCapabilities:localCapabilities, remoteCapabilities:null, rtpSender:rtpSender, rtpReceiver:rtpReceiver, kind:kind, mid:mid, sendEncodingParameters:sendEncodingParameters, recvEncodingParameters:null};
        });
        if (this.usingBundle) {
          sdp += "a=group:BUNDLE " + transceivers.map(function(t) {
            return t.mid;
          }).join(" ") + "\r\n";
        }
        tracks.forEach(function(mline, sdpMLineIndex) {
          var transceiver = transceivers[sdpMLineIndex];
          sdp += SDPUtils.writeMediaSection(transceiver, transceiver.localCapabilities, "offer", self.localStreams[0]);
        });
        this._pendingOffer = transceivers;
        var desc = new RTCSessionDescription({type:"offer", sdp:sdp});
        if (arguments.length && typeof arguments[0] === "function") {
          window.setTimeout(arguments[0], 0, desc);
        }
        return Promise.resolve(desc);
      };
      window.RTCPeerConnection.prototype.createAnswer = function() {
        var self = this;
        var sdp = SDPUtils.writeSessionBoilerplate();
        if (this.usingBundle) {
          sdp += "a=group:BUNDLE " + this.transceivers.map(function(t) {
            return t.mid;
          }).join(" ") + "\r\n";
        }
        this.transceivers.forEach(function(transceiver) {
          if (transceiver.isDatachannel) {
            sdp += "m=application 0 DTLS/SCTP 5000\r\n" + "c=IN IP4 0.0.0.0\r\n" + "a=mid:" + transceiver.mid + "\r\n";
            return;
          }
          var commonCapabilities = self._getCommonCapabilities(transceiver.localCapabilities, transceiver.remoteCapabilities);
          sdp += SDPUtils.writeMediaSection(transceiver, commonCapabilities, "answer", self.localStreams[0]);
        });
        var desc = new RTCSessionDescription({type:"answer", sdp:sdp});
        if (arguments.length && typeof arguments[0] === "function") {
          window.setTimeout(arguments[0], 0, desc);
        }
        return Promise.resolve(desc);
      };
      window.RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
        if (!candidate) {
          this.transceivers.forEach(function(transceiver) {
            transceiver.iceTransport.addRemoteCandidate({});
          });
        } else {
          var mLineIndex = candidate.sdpMLineIndex;
          if (candidate.sdpMid) {
            for (var i = 0;i < this.transceivers.length;i++) {
              if (this.transceivers[i].mid === candidate.sdpMid) {
                mLineIndex = i;
                break;
              }
            }
          }
          var transceiver = this.transceivers[mLineIndex];
          if (transceiver) {
            var cand = Object.keys(candidate.candidate).length > 0 ? SDPUtils.parseCandidate(candidate.candidate) : {};
            if (cand.protocol === "tcp" && (cand.port === 0 || cand.port === 9)) {
              return;
            }
            if (cand.component !== "1") {
              return;
            }
            if (cand.type === "endOfCandidates") {
              cand = {};
            }
            transceiver.iceTransport.addRemoteCandidate(cand);
            var sections = SDPUtils.splitSections(this.remoteDescription.sdp);
            sections[mLineIndex + 1] += (cand.type ? candidate.candidate.trim() : "a=end-of-candidates") + "\r\n";
            this.remoteDescription.sdp = sections.join("");
          }
        }
        if (arguments.length > 1 && typeof arguments[1] === "function") {
          window.setTimeout(arguments[1], 0);
        }
        return Promise.resolve();
      };
      window.RTCPeerConnection.prototype.getStats = function() {
        var promises = [];
        this.transceivers.forEach(function(transceiver) {
          ["rtpSender", "rtpReceiver", "iceGatherer", "iceTransport", "dtlsTransport"].forEach(function(method) {
            if (transceiver[method]) {
              promises.push(transceiver[method].getStats());
            }
          });
        });
        var cb = arguments.length > 1 && typeof arguments[1] === "function" && arguments[1];
        return new Promise(function(resolve) {
          var results = new Map;
          Promise.all(promises).then(function(res) {
            res.forEach(function(result) {
              Object.keys(result).forEach(function(id) {
                results.set(id, result[id]);
                results[id] = result[id];
              });
            });
            if (cb) {
              window.setTimeout(cb, 0, results);
            }
            resolve(results);
          });
        });
      };
    }};
    module.exports = {shimPeerConnection:edgeShim.shimPeerConnection, shimGetUserMedia:require("./getusermedia")};
  }, {"../utils":10, "./getusermedia":6, "sdp":1}], 6:[function(require, module, exports) {
    module.exports = function() {
      var shimError_ = function(e) {
        return {name:{PermissionDeniedError:"NotAllowedError"}[e.name] || e.name, message:e.message, constraint:e.constraint, toString:function() {
          return this.name;
        }};
      };
      var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function(c) {
        return origGetUserMedia(c)["catch"](function(e) {
          return Promise.reject(shimError_(e));
        });
      };
    };
  }, {}], 7:[function(require, module, exports) {
    var browserDetails = require("../utils").browserDetails;
    var firefoxShim = {shimOnTrack:function() {
      if (typeof window === "object" && window.RTCPeerConnection && !("ontrack" in window.RTCPeerConnection.prototype)) {
        Object.defineProperty(window.RTCPeerConnection.prototype, "ontrack", {get:function() {
          return this._ontrack;
        }, set:function(f) {
          if (this._ontrack) {
            this.removeEventListener("track", this._ontrack);
            this.removeEventListener("addstream", this._ontrackpoly);
          }
          this.addEventListener("track", this._ontrack = f);
          this.addEventListener("addstream", this._ontrackpoly = function(e) {
            e.stream.getTracks().forEach(function(track) {
              var event = new Event("track");
              event.track = track;
              event.receiver = {track:track};
              event.streams = [e.stream];
              this.dispatchEvent(event);
            }.bind(this));
          }.bind(this));
        }});
      }
    }, shimSourceObject:function() {
      if (typeof window === "object") {
        if (window.HTMLMediaElement && !("srcObject" in window.HTMLMediaElement.prototype)) {
          Object.defineProperty(window.HTMLMediaElement.prototype, "srcObject", {get:function() {
            return this.mozSrcObject;
          }, set:function(stream) {
            this.mozSrcObject = stream;
          }});
        }
      }
    }, shimPeerConnection:function() {
      if (typeof window !== "object" || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) {
        return;
      }
      if (!window.RTCPeerConnection) {
        window.RTCPeerConnection = function(pcConfig, pcConstraints) {
          if (browserDetails.version < 38) {
            if (pcConfig && pcConfig.iceServers) {
              var newIceServers = [];
              for (var i = 0;i < pcConfig.iceServers.length;i++) {
                var server = pcConfig.iceServers[i];
                if (server.hasOwnProperty("urls")) {
                  for (var j = 0;j < server.urls.length;j++) {
                    var newServer = {url:server.urls[j]};
                    if (server.urls[j].indexOf("turn") === 0) {
                      newServer.username = server.username;
                      newServer.credential = server.credential;
                    }
                    newIceServers.push(newServer);
                  }
                } else {
                  newIceServers.push(pcConfig.iceServers[i]);
                }
              }
              pcConfig.iceServers = newIceServers;
            }
          }
          return new mozRTCPeerConnection(pcConfig, pcConstraints);
        };
        window.RTCPeerConnection.prototype = mozRTCPeerConnection.prototype;
        if (mozRTCPeerConnection.generateCertificate) {
          Object.defineProperty(window.RTCPeerConnection, "generateCertificate", {get:function() {
            return mozRTCPeerConnection.generateCertificate;
          }});
        }
        window.RTCSessionDescription = mozRTCSessionDescription;
        window.RTCIceCandidate = mozRTCIceCandidate;
      }
      ["setLocalDescription", "setRemoteDescription", "addIceCandidate"].forEach(function(method) {
        var nativeMethod = RTCPeerConnection.prototype[method];
        RTCPeerConnection.prototype[method] = function() {
          arguments[0] = new (method === "addIceCandidate" ? RTCIceCandidate : RTCSessionDescription)(arguments[0]);
          return nativeMethod.apply(this, arguments);
        };
      });
      var nativeAddIceCandidate = RTCPeerConnection.prototype.addIceCandidate;
      RTCPeerConnection.prototype.addIceCandidate = function() {
        if (!arguments[0]) {
          if (arguments[1]) {
            arguments[1].apply(null);
          }
          return Promise.resolve();
        }
        return nativeAddIceCandidate.apply(this, arguments);
      };
      if (browserDetails.version < 48) {
        var makeMapStats = function(stats) {
          var map = new Map;
          Object.keys(stats).forEach(function(key) {
            map.set(key, stats[key]);
            map[key] = stats[key];
          });
          return map;
        };
        var nativeGetStats = RTCPeerConnection.prototype.getStats;
        RTCPeerConnection.prototype.getStats = function(selector, onSucc, onErr) {
          return nativeGetStats.apply(this, [selector || null]).then(function(stats) {
            return makeMapStats(stats);
          }).then(onSucc, onErr);
        };
      }
    }};
    module.exports = {shimOnTrack:firefoxShim.shimOnTrack, shimSourceObject:firefoxShim.shimSourceObject, shimPeerConnection:firefoxShim.shimPeerConnection, shimGetUserMedia:require("./getusermedia")};
  }, {"../utils":10, "./getusermedia":8}], 8:[function(require, module, exports) {
    var logging = require("../utils").log;
    var browserDetails = require("../utils").browserDetails;
    module.exports = function() {
      var shimError_ = function(e) {
        return {name:{SecurityError:"NotAllowedError", PermissionDeniedError:"NotAllowedError"}[e.name] || e.name, message:{"The operation is insecure.":"The request is not allowed by the " + "user agent or the platform in the current context."}[e.message] || e.message, constraint:e.constraint, toString:function() {
          return this.name + (this.message && ": ") + this.message;
        }};
      };
      var getUserMedia_ = function(constraints, onSuccess, onError) {
        var constraintsToFF37_ = function(c) {
          if (typeof c !== "object" || c.require) {
            return c;
          }
          var require = [];
          Object.keys(c).forEach(function(key) {
            if (key === "require" || key === "advanced" || key === "mediaSource") {
              return;
            }
            var r = c[key] = typeof c[key] === "object" ? c[key] : {ideal:c[key]};
            if (r.min !== undefined || r.max !== undefined || r.exact !== undefined) {
              require.push(key);
            }
            if (r.exact !== undefined) {
              if (typeof r.exact === "number") {
                r.min = r.max = r.exact;
              } else {
                c[key] = r.exact;
              }
              delete r.exact;
            }
            if (r.ideal !== undefined) {
              c.advanced = c.advanced || [];
              var oc = {};
              if (typeof r.ideal === "number") {
                oc[key] = {min:r.ideal, max:r.ideal};
              } else {
                oc[key] = r.ideal;
              }
              c.advanced.push(oc);
              delete r.ideal;
              if (!Object.keys(r).length) {
                delete c[key];
              }
            }
          });
          if (require.length) {
            c.require = require;
          }
          return c;
        };
        constraints = JSON.parse(JSON.stringify(constraints));
        if (browserDetails.version < 38) {
          logging("spec: " + JSON.stringify(constraints));
          if (constraints.audio) {
            constraints.audio = constraintsToFF37_(constraints.audio);
          }
          if (constraints.video) {
            constraints.video = constraintsToFF37_(constraints.video);
          }
          logging("ff37: " + JSON.stringify(constraints));
        }
        return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
          onError(shimError_(e));
        });
      };
      var getUserMediaPromise_ = function(constraints) {
        return new Promise(function(resolve, reject) {
          getUserMedia_(constraints, resolve, reject);
        });
      };
      if (!navigator.mediaDevices) {
        navigator.mediaDevices = {getUserMedia:getUserMediaPromise_, addEventListener:function() {
        }, removeEventListener:function() {
        }};
      }
      navigator.mediaDevices.enumerateDevices = navigator.mediaDevices.enumerateDevices || function() {
        return new Promise(function(resolve) {
          var infos = [{kind:"audioinput", deviceId:"default", label:"", groupId:""}, {kind:"videoinput", deviceId:"default", label:"", groupId:""}];
          resolve(infos);
        });
      };
      if (browserDetails.version < 41) {
        var orgEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
        navigator.mediaDevices.enumerateDevices = function() {
          return orgEnumerateDevices().then(undefined, function(e) {
            if (e.name === "NotFoundError") {
              return [];
            }
            throw e;
          });
        };
      }
      if (browserDetails.version < 49) {
        var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function(c) {
          return origGetUserMedia(c).then(function(stream) {
            if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
              stream.getTracks().forEach(function(track) {
                track.stop();
              });
              throw new DOMException("The object can not be found here.", "NotFoundError");
            }
            return stream;
          }, function(e) {
            return Promise.reject(shimError_(e));
          });
        };
      }
      navigator.getUserMedia = function(constraints, onSuccess, onError) {
        if (browserDetails.version < 44) {
          return getUserMedia_(constraints, onSuccess, onError);
        }
        console.warn("navigator.getUserMedia has been replaced by " + "navigator.mediaDevices.getUserMedia");
        navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
      };
    };
  }, {"../utils":10}], 9:[function(require, module, exports) {
    var safariShim = {shimGetUserMedia:function() {
      navigator.getUserMedia = navigator.webkitGetUserMedia;
    }};
    module.exports = {shimGetUserMedia:safariShim.shimGetUserMedia};
  }, {}], 10:[function(require, module, exports) {
    var logDisabled_ = true;
    var utils = {disableLog:function(bool) {
      if (typeof bool !== "boolean") {
        return new Error("Argument type: " + typeof bool + ". Please use a boolean.");
      }
      logDisabled_ = bool;
      return bool ? "adapter.js logging disabled" : "adapter.js logging enabled";
    }, log:function() {
      if (typeof window === "object") {
        if (logDisabled_) {
          return;
        }
        if (typeof console !== "undefined" && typeof console.log === "function") {
          console.log.apply(console, arguments);
        }
      }
    }, extractVersion:function(uastring, expr, pos) {
      var match = uastring.match(expr);
      return match && match.length >= pos && parseInt(match[pos], 10);
    }, detectBrowser:function() {
      var result = {};
      result.browser = null;
      result.version = null;
      if (typeof window === "undefined" || !window.navigator) {
        result.browser = "Not a browser.";
        return result;
      }
      if (navigator.mozGetUserMedia) {
        result.browser = "firefox";
        result.version = this.extractVersion(navigator.userAgent, /Firefox\/([0-9]+)\./, 1);
      } else {
        if (navigator.webkitGetUserMedia) {
          if (window.webkitRTCPeerConnection) {
            result.browser = "chrome";
            result.version = this.extractVersion(navigator.userAgent, /Chrom(e|ium)\/([0-9]+)\./, 2);
          } else {
            if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
              result.browser = "safari";
              result.version = this.extractVersion(navigator.userAgent, /AppleWebKit\/([0-9]+)\./, 1);
            } else {
              result.browser = "Unsupported webkit-based browser " + "with GUM support but no WebRTC support.";
              return result;
            }
          }
        } else {
          if (navigator.mediaDevices && navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
            result.browser = "edge";
            result.version = this.extractVersion(navigator.userAgent, /Edge\/(\d+).(\d+)$/, 2);
          } else {
            result.browser = "Not a supported browser.";
            return result;
          }
        }
      }
      return result;
    }};
    module.exports = {log:utils.log, disableLog:utils.disableLog, browserDetails:utils.detectBrowser(), extractVersion:utils.extractVersion};
  }, {}]}, {}, [2])(2);
});
var Analytics = function(roomServer) {
  this.analyticsPath_ = roomServer + "/a/";
};
Analytics.EventObject_ = {};
Analytics.prototype.reportEvent = function(eventType, roomId, flowId) {
  var eventObj = {};
  eventObj[enums.RequestField.EventField.EVENT_TYPE] = eventType;
  eventObj[enums.RequestField.EventField.EVENT_TIME_MS] = Date.now();
  if (roomId) {
    eventObj[enums.RequestField.EventField.ROOM_ID] = roomId;
  }
  if (flowId) {
    eventObj[enums.RequestField.EventField.FLOW_ID] = flowId;
  }
  this.sendEventRequest_(eventObj);
};
Analytics.prototype.sendEventRequest_ = function(eventObj) {
  var request = {};
  request[enums.RequestField.TYPE] = enums.RequestField.MessageType.EVENT;
  request[enums.RequestField.REQUEST_TIME_MS] = Date.now();
  request[enums.RequestField.EVENT] = eventObj;
  sendAsyncUrlRequest("POST", this.analyticsPath_, JSON.stringify(request)).then(function() {
  }.bind(this), function(error) {
    trace("Failed to send event request: " + error.message);
  }.bind(this));
};
var enums = {"EventType":{"ICE_CONNECTION_STATE_CONNECTED":3, "ROOM_SIZE_2":2}, "RequestField":{"MessageType":{"EVENT":"event"}, "CLIENT_TYPE":"client_type", "EventField":{"EVENT_TIME_MS":"event_time_ms", "ROOM_ID":"room_id", "EVENT_TYPE":"event_type", "FLOW_ID":"flow_id"}, "TYPE":"type", "EVENT":"event", "REQUEST_TIME_MS":"request_time_ms"}, "ClientType":{"UNKNOWN":0, "ANDROID":4, "DESKTOP":2, "IOS":3, "JS":1}};
var remoteVideo = $("#remote-video");
var UI_CONSTANTS = {confirmJoinButton:"#confirm-join-button", confirmJoinDiv:"#confirm-join-div", confirmJoinRoomSpan:"#confirm-join-room-span", fullscreenSvg:"#fullscreen", hangupSvg:"#hangup", icons:"#icons", infoDiv:"#info-div", localVideo:"#local-video", miniVideo:"#mini-video", muteAudioSvg:"#mute-audio", muteVideoSvg:"#mute-video", newRoomButton:"#new-room-button", newRoomLink:"#new-room-link", privacyLinks:"#privacy", remoteVideo:"#remote-video", rejoinButton:"#rejoin-button", rejoinDiv:"#rejoin-div", 
rejoinLink:"#rejoin-link", roomLinkHref:"#room-link-href", roomSelectionDiv:"#room-selection", roomSelectionInput:"#room-id-input", roomSelectionInputLabel:"#room-id-input-label", roomSelectionJoinButton:"#join-button", roomSelectionRandomButton:"#random-button", roomSelectionRecentList:"#recent-rooms-list", sharingDiv:"#sharing-div", statusDiv:"#status-div", videosDiv:"#videos"};
var AppController = function(loadingParams) {
  trace("Initializing; server= " + loadingParams.roomServer + ".");
  trace("Initializing; room=" + loadingParams.roomId + ".");
  this.hangupSvg_ = $(UI_CONSTANTS.hangupSvg);
  this.icons_ = $(UI_CONSTANTS.icons);
  this.localVideo_ = $(UI_CONSTANTS.localVideo);
  this.miniVideo_ = $(UI_CONSTANTS.miniVideo);
  this.sharingDiv_ = $(UI_CONSTANTS.sharingDiv);
  this.statusDiv_ = $(UI_CONSTANTS.statusDiv);
  this.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
  this.videosDiv_ = $(UI_CONSTANTS.videosDiv);
  this.roomLinkHref_ = $(UI_CONSTANTS.roomLinkHref);
  this.rejoinDiv_ = $(UI_CONSTANTS.rejoinDiv);
  this.rejoinLink_ = $(UI_CONSTANTS.rejoinLink);
  this.newRoomLink_ = $(UI_CONSTANTS.newRoomLink);
  this.rejoinButton_ = $(UI_CONSTANTS.rejoinButton);
  this.newRoomButton_ = $(UI_CONSTANTS.newRoomButton);
  this.newRoomButton_.addEventListener("click", this.onNewRoomClick_.bind(this), false);
  this.rejoinButton_.addEventListener("click", this.onRejoinClick_.bind(this), false);
  this.muteAudioIconSet_ = new AppController.IconSet_(UI_CONSTANTS.muteAudioSvg);
  this.muteVideoIconSet_ = new AppController.IconSet_(UI_CONSTANTS.muteVideoSvg);
  this.fullscreenIconSet_ = new AppController.IconSet_(UI_CONSTANTS.fullscreenSvg);
  this.loadingParams_ = loadingParams;
  this.loadUrlParams_();
  var paramsPromise = Promise.resolve({});
  if (this.loadingParams_.paramsFunction) {
    paramsPromise = this.loadingParams_.paramsFunction();
  }
  Promise.resolve(paramsPromise).then(function(newParams) {
    if (newParams) {
      Object.keys(newParams).forEach(function(key) {
        this.loadingParams_[key] = newParams[key];
      }.bind(this));
    }
    this.roomLink_ = "";
    this.roomSelection_ = null;
    this.localStream_ = null;
    this.remoteVideoResetTimer_ = null;
    if (this.loadingParams_.roomId) {
      this.createCall_();
      if (!RoomSelection.matchRandomRoomPattern(this.loadingParams_.roomId)) {
        $(UI_CONSTANTS.confirmJoinRoomSpan).textContent = ' "' + this.loadingParams_.roomId + '"';
      }
      var confirmJoinDiv = $(UI_CONSTANTS.confirmJoinDiv);
      this.show_(confirmJoinDiv);
      $(UI_CONSTANTS.confirmJoinButton).onclick = function() {
        this.hide_(confirmJoinDiv);
        var recentlyUsedList = new RoomSelection.RecentlyUsedList;
        recentlyUsedList.pushRecentRoom(this.loadingParams_.roomId);
        this.finishCallSetup_(this.loadingParams_.roomId);
      }.bind(this);
      if (this.loadingParams_.bypassJoinConfirmation) {
        $(UI_CONSTANTS.confirmJoinButton).onclick();
      }
    } else {
      this.showRoomSelection_();
    }
  }.bind(this))["catch"](function(error) {
    trace("Error initializing: " + error.message);
  }.bind(this));
};
AppController.prototype.createCall_ = function() {
  var privacyLinks = $(UI_CONSTANTS.privacyLinks);
  this.hide_(privacyLinks);
  this.call_ = new Call(this.loadingParams_);
  this.infoBox_ = new InfoBox($(UI_CONSTANTS.infoDiv), this.remoteVideo_, this.call_, this.loadingParams_.versionInfo);
  var roomErrors = this.loadingParams_.errorMessages;
  var roomWarnings = this.loadingParams_.warningMessages;
  if (roomErrors && roomErrors.length > 0) {
    for (var i = 0;i < roomErrors.length;++i) {
      this.infoBox_.pushErrorMessage(roomErrors[i]);
    }
    return;
  } else {
    if (roomWarnings && roomWarnings.length > 0) {
      for (var j = 0;j < roomWarnings.length;++j) {
        this.infoBox_.pushWarningMessage(roomWarnings[j]);
      }
    }
  }
  this.call_.onremotehangup = this.onRemoteHangup_.bind(this);
  this.call_.onremotesdpset = this.onRemoteSdpSet_.bind(this);
  this.call_.onremotestreamadded = this.onRemoteStreamAdded_.bind(this);
  this.call_.onlocalstreamadded = this.onLocalStreamAdded_.bind(this);
  this.call_.onsignalingstatechange = this.infoBox_.updateInfoDiv.bind(this.infoBox_);
  this.call_.oniceconnectionstatechange = this.infoBox_.updateInfoDiv.bind(this.infoBox_);
  this.call_.onnewicecandidate = this.infoBox_.recordIceCandidateTypes.bind(this.infoBox_);
  this.call_.onerror = this.displayError_.bind(this);
  this.call_.onstatusmessage = this.displayStatus_.bind(this);
  this.call_.oncallerstarted = this.displaySharingInfo_.bind(this);
};
AppController.prototype.showRoomSelection_ = function() {
  var roomSelectionDiv = $(UI_CONSTANTS.roomSelectionDiv);
  this.roomSelection_ = new RoomSelection(roomSelectionDiv, UI_CONSTANTS);
  this.show_(roomSelectionDiv);
  this.roomSelection_.onRoomSelected = function(roomName) {
    this.hide_(roomSelectionDiv);
    this.createCall_();
    this.finishCallSetup_(roomName);
    this.roomSelection_.removeEventListeners();
    this.roomSelection_ = null;
    if (this.localStream_) {
      this.attachLocalStream_();
    }
  }.bind(this);
};
AppController.prototype.setupUi_ = function() {
  this.iconEventSetup_();
  document.onkeypress = this.onKeyPress_.bind(this);
  window.onmousemove = this.showIcons_.bind(this);
  $(UI_CONSTANTS.muteAudioSvg).onclick = this.toggleAudioMute_.bind(this);
  $(UI_CONSTANTS.muteVideoSvg).onclick = this.toggleVideoMute_.bind(this);
  $(UI_CONSTANTS.fullscreenSvg).onclick = this.toggleFullScreen_.bind(this);
  $(UI_CONSTANTS.hangupSvg).onclick = this.hangup_.bind(this);
  setUpFullScreen();
};
AppController.prototype.finishCallSetup_ = function(roomId) {
  this.call_.start(roomId);
  this.setupUi_();
  if (!isChromeApp()) {
    window.onbeforeunload = function() {
      this.call_.hangup(false);
    }.bind(this);
    window.onpopstate = function(event) {
      if (!event.state) {
        trace("Reloading main page.");
        location.href = location.origin;
      } else {
        if (event.state.roomLink) {
          location.href = event.state.roomLink;
        }
      }
    };
  }
};
AppController.prototype.hangup_ = function() {
  trace("Hanging up.");
  this.hide_(this.icons_);
  this.displayStatus_("Hanging up");
  this.transitionToDone_();
  this.call_.hangup(true);
  document.onkeypress = null;
  window.onmousemove = null;
};
AppController.prototype.onRemoteHangup_ = function() {
  this.displayStatus_("The remote side hung up.");
  this.transitionToWaiting_();
  this.call_.onRemoteHangup();
};
AppController.prototype.onRemoteSdpSet_ = function(hasRemoteVideo) {
  if (hasRemoteVideo) {
    trace("Waiting for remote video.");
    this.waitForRemoteVideo_();
  } else {
    trace("No remote video stream; not waiting for media to arrive.");
    this.transitionToActive_();
  }
};
AppController.prototype.waitForRemoteVideo_ = function() {
  if (this.remoteVideo_.readyState >= 2) {
    trace("Remote video started; currentTime: " + this.remoteVideo_.currentTime);
    this.transitionToActive_();
  } else {
    this.remoteVideo_.oncanplay = this.waitForRemoteVideo_.bind(this);
  }
};
AppController.prototype.onRemoteStreamAdded_ = function(stream) {
  this.deactivate_(this.sharingDiv_);
  trace("Remote stream added.");
  this.remoteVideo_.srcObject = stream;
  if (this.remoteVideoResetTimer_) {
    clearTimeout(this.remoteVideoResetTimer_);
    this.remoteVideoResetTimer_ = null;
  }
};
AppController.prototype.onLocalStreamAdded_ = function(stream) {
  trace("User has granted access to local media.");
  this.localStream_ = stream;
  if (!this.roomSelection_) {
    this.attachLocalStream_();
  }
};
AppController.prototype.attachLocalStream_ = function() {
  trace("Attaching local stream.");
  this.localVideo_.srcObject = this.localStream_;
  this.displayStatus_("");
  this.activate_(this.localVideo_);
  this.show_(this.icons_);
  if (this.localStream_.getVideoTracks().length === 0) {
    this.hide_($(UI_CONSTANTS.muteVideoSvg));
  }
  if (this.localStream_.getAudioTracks().length === 0) {
    this.hide_($(UI_CONSTANTS.muteAudioSvg));
  }
};
AppController.prototype.transitionToActive_ = function() {
  this.remoteVideo_.oncanplay = undefined;
  var connectTime = window.performance.now();
  this.infoBox_.setSetupTimes(this.call_.startTime, connectTime);
  this.infoBox_.updateInfoDiv();
  trace("Call setup time: " + (connectTime - this.call_.startTime).toFixed(0) + "ms.");
  trace("reattachMediaStream: " + this.localVideo_.srcObject);
  this.miniVideo_.srcObject = this.localVideo_.srcObject;
  this.activate_(this.remoteVideo_);
  this.activate_(this.miniVideo_);
  this.deactivate_(this.localVideo_);
  this.localVideo_.srcObject = null;
  this.activate_(this.videosDiv_);
  this.show_(this.hangupSvg_);
  this.displayStatus_("");
};
AppController.prototype.transitionToWaiting_ = function() {
  this.remoteVideo_.oncanplay = undefined;
  this.hide_(this.hangupSvg_);
  this.deactivate_(this.videosDiv_);
  if (!this.remoteVideoResetTimer_) {
    this.remoteVideoResetTimer_ = setTimeout(function() {
      this.remoteVideoResetTimer_ = null;
      trace("Resetting remoteVideo src after transitioning to waiting.");
      this.remoteVideo_.srcObject = null;
    }.bind(this), 800);
  }
  this.localVideo_.srcObject = this.miniVideo_.srcObject;
  this.activate_(this.localVideo_);
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
};
AppController.prototype.transitionToDone_ = function() {
  this.remoteVideo_.oncanplay = undefined;
  this.deactivate_(this.localVideo_);
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
  this.hide_(this.hangupSvg_);
  this.activate_(this.rejoinDiv_);
  this.show_(this.rejoinDiv_);
  this.displayStatus_("");
};
AppController.prototype.onRejoinClick_ = function() {
  this.deactivate_(this.rejoinDiv_);
  this.hide_(this.rejoinDiv_);
  this.call_.restart();
  this.setupUi_();
};
AppController.prototype.onNewRoomClick_ = function() {
  this.deactivate_(this.rejoinDiv_);
  this.hide_(this.rejoinDiv_);
  this.showRoomSelection_();
};
AppController.prototype.onKeyPress_ = function(event) {
  switch(String.fromCharCode(event.charCode)) {
    case " ":
    case "m":
      if (this.call_) {
        this.call_.toggleAudioMute();
        this.muteAudioIconSet_.toggle();
      }
      return false;
    case "c":
      if (this.call_) {
        this.call_.toggleVideoMute();
        this.muteVideoIconSet_.toggle();
      }
      return false;
    case "f":
      this.toggleFullScreen_();
      return false;
    case "i":
      this.infoBox_.toggleInfoDiv();
      return false;
    case "q":
      this.hangup_();
      return false;
    case "l":
      this.toggleMiniVideo_();
      return false;
    default:
      return;
  }
};
AppController.prototype.pushCallNavigation_ = function(roomId, roomLink) {
  if (!isChromeApp()) {
    window.history.pushState({"roomId":roomId, "roomLink":roomLink}, roomId, roomLink);
  }
};
AppController.prototype.displaySharingInfo_ = function(roomId, roomLink) {
  this.roomLinkHref_.href = roomLink;
  this.roomLinkHref_.text = roomLink;
  this.roomLink_ = roomLink;
  this.pushCallNavigation_(roomId, roomLink);
  this.activate_(this.sharingDiv_);
};
AppController.prototype.displayStatus_ = function(status) {
  if (status === "") {
    this.deactivate_(this.statusDiv_);
  } else {
    this.activate_(this.statusDiv_);
  }
  this.statusDiv_.innerHTML = status;
};
AppController.prototype.displayError_ = function(error) {
  trace(error);
  this.infoBox_.pushErrorMessage(error);
};
AppController.prototype.toggleAudioMute_ = function() {
  this.call_.toggleAudioMute();
  this.muteAudioIconSet_.toggle();
};
AppController.prototype.toggleVideoMute_ = function() {
  this.call_.toggleVideoMute();
  this.muteVideoIconSet_.toggle();
};
AppController.prototype.toggleFullScreen_ = function() {
  if (isFullScreen()) {
    trace("Exiting fullscreen.");
    document.querySelector("svg#fullscreen title").textContent = "Enter fullscreen";
    document.cancelFullScreen();
  } else {
    trace("Entering fullscreen.");
    document.querySelector("svg#fullscreen title").textContent = "Exit fullscreen";
    document.body.requestFullScreen();
  }
  this.fullscreenIconSet_.toggle();
};
AppController.prototype.toggleMiniVideo_ = function() {
  if (this.miniVideo_.classList.contains("active")) {
    this.deactivate_(this.miniVideo_);
  } else {
    this.activate_(this.miniVideo_);
  }
};
AppController.prototype.hide_ = function(element) {
  element.classList.add("hidden");
};
AppController.prototype.show_ = function(element) {
  element.classList.remove("hidden");
};
AppController.prototype.activate_ = function(element) {
  element.classList.add("active");
};
AppController.prototype.deactivate_ = function(element) {
  element.classList.remove("active");
};
AppController.prototype.showIcons_ = function() {
  if (!this.icons_.classList.contains("active")) {
    this.activate_(this.icons_);
    this.setIconTimeout_();
  }
};
AppController.prototype.hideIcons_ = function() {
  if (this.icons_.classList.contains("active")) {
    this.deactivate_(this.icons_);
  }
};
AppController.prototype.setIconTimeout_ = function() {
  if (this.hideIconsAfterTimeout) {
    window.clearTimeout.bind(this, this.hideIconsAfterTimeout);
  }
  this.hideIconsAfterTimeout = window.setTimeout(function() {
    this.hideIcons_();
  }.bind(this), 5E3);
};
AppController.prototype.iconEventSetup_ = function() {
  this.icons_.onmouseenter = function() {
    window.clearTimeout(this.hideIconsAfterTimeout);
  }.bind(this);
  this.icons_.onmouseleave = function() {
    this.setIconTimeout_();
  }.bind(this);
};
AppController.prototype.loadUrlParams_ = function() {
  var DEFAULT_VIDEO_CODEC = "VP9";
  var urlParams = queryStringToDictionary(window.location.search);
  this.loadingParams_.audioSendBitrate = urlParams["asbr"];
  this.loadingParams_.audioSendCodec = urlParams["asc"];
  this.loadingParams_.audioRecvBitrate = urlParams["arbr"];
  this.loadingParams_.audioRecvCodec = urlParams["arc"];
  this.loadingParams_.opusMaxPbr = urlParams["opusmaxpbr"];
  this.loadingParams_.opusFec = urlParams["opusfec"];
  this.loadingParams_.opusDtx = urlParams["opusdtx"];
  this.loadingParams_.opusStereo = urlParams["stereo"];
  this.loadingParams_.videoSendBitrate = urlParams["vsbr"];
  this.loadingParams_.videoSendInitialBitrate = urlParams["vsibr"];
  this.loadingParams_.videoSendCodec = urlParams["vsc"];
  this.loadingParams_.videoRecvBitrate = urlParams["vrbr"];
  this.loadingParams_.videoRecvCodec = urlParams["vrc"] || DEFAULT_VIDEO_CODEC;
  this.loadingParams_.videoFec = urlParams["videofec"];
};
AppController.IconSet_ = function(iconSelector) {
  this.iconElement = document.querySelector(iconSelector);
};
AppController.IconSet_.prototype.toggle = function() {
  if (this.iconElement.classList.contains("on")) {
    this.iconElement.classList.remove("on");
  } else {
    this.iconElement.classList.add("on");
  }
};
var Call = function(params) {
  this.params_ = params;
  this.roomServer_ = params.roomServer || "";
  this.channel_ = new SignalingChannel(params.wssUrl, params.wssPostUrl);
  this.channel_.onmessage = this.onRecvSignalingChannelMessage_.bind(this);
  this.pcClient_ = null;
  this.localStream_ = null;
  this.errorMessageQueue_ = [];
  this.startTime = null;
  this.oncallerstarted = null;
  this.onerror = null;
  this.oniceconnectionstatechange = null;
  this.onlocalstreamadded = null;
  this.onnewicecandidate = null;
  this.onremotehangup = null;
  this.onremotesdpset = null;
  this.onremotestreamadded = null;
  this.onsignalingstatechange = null;
  this.onstatusmessage = null;
  this.getMediaPromise_ = null;
  this.getIceServersPromise_ = null;
  this.requestMediaAndIceServers_();
};
Call.prototype.requestMediaAndIceServers_ = function() {
  this.getMediaPromise_ = this.maybeGetMedia_();
  this.getIceServersPromise_ = this.maybeGetIceServers_();
};
Call.prototype.isInitiator = function() {
  return this.params_.isInitiator;
};
Call.prototype.start = function(roomId) {
  this.connectToRoom_(roomId);
  if (this.params_.isLoopback) {
    setupLoopback(this.params_.wssUrl, roomId);
  }
};
Call.prototype.queueCleanupMessages_ = function() {
  apprtc.windowPort.sendMessage({action:Constants.QUEUEADD_ACTION, queueMessage:{action:Constants.XHR_ACTION, method:"POST", url:this.getLeaveUrl_(), body:null}});
  apprtc.windowPort.sendMessage({action:Constants.QUEUEADD_ACTION, queueMessage:{action:Constants.WS_ACTION, wsAction:Constants.WS_SEND_ACTION, data:JSON.stringify({cmd:"send", msg:JSON.stringify({type:"bye"})})}});
  apprtc.windowPort.sendMessage({action:Constants.QUEUEADD_ACTION, queueMessage:{action:Constants.XHR_ACTION, method:"DELETE", url:this.channel_.getWssPostUrl(), body:null}});
};
Call.prototype.clearCleanupQueue_ = function() {
  apprtc.windowPort.sendMessage({action:Constants.QUEUECLEAR_ACTION});
};
Call.prototype.restart = function() {
  this.requestMediaAndIceServers_();
  this.start(this.params_.previousRoomId);
};
Call.prototype.hangup = function(async) {
  this.startTime = null;
  if (isChromeApp()) {
    this.clearCleanupQueue_();
  }
  if (this.localStream_) {
    if (typeof this.localStream_.getTracks === "undefined") {
      this.localStream_.stop();
    } else {
      this.localStream_.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    this.localStream_ = null;
  }
  if (!this.params_.roomId) {
    return;
  }
  if (this.pcClient_) {
    this.pcClient_.close();
    this.pcClient_ = null;
  }
  var steps = [];
  steps.push({step:function() {
    var path = this.getLeaveUrl_();
    return sendUrlRequest("POST", path, async);
  }.bind(this), errorString:"Error sending /leave:"});
  steps.push({step:function() {
    this.channel_.send(JSON.stringify({type:"bye"}));
  }.bind(this), errorString:"Error sending bye:"});
  steps.push({step:function() {
    return this.channel_.close(async);
  }.bind(this), errorString:"Error closing signaling channel:"});
  steps.push({step:function() {
    this.params_.previousRoomId = this.params_.roomId;
    this.params_.roomId = null;
    this.params_.clientId = null;
  }.bind(this), errorString:"Error setting params:"});
  if (async) {
    var errorHandler = function(errorString, error) {
      trace(errorString + " " + error.message);
    };
    var promise = Promise.resolve();
    for (var i = 0;i < steps.length;++i) {
      promise = promise.then(steps[i].step)["catch"](errorHandler.bind(this, steps[i].errorString));
    }
    return promise;
  }
  var executeStep = function(executor, errorString) {
    try {
      executor();
    } catch (ex) {
      trace(errorString + " " + ex);
    }
  };
  for (var j = 0;j < steps.length;++j) {
    executeStep(steps[j].step, steps[j].errorString);
  }
  if (this.params_.roomId !== null || this.params_.clientId !== null) {
    trace("ERROR: sync cleanup tasks did not complete successfully.");
  } else {
    trace("Cleanup completed.");
  }
  return Promise.resolve();
};
Call.prototype.getLeaveUrl_ = function() {
  return this.roomServer_ + "/leave/" + this.params_.roomId + "/" + this.params_.clientId;
};
Call.prototype.onRemoteHangup = function() {
  this.startTime = null;
  this.params_.isInitiator = true;
  if (this.pcClient_) {
    this.pcClient_.close();
    this.pcClient_ = null;
  }
  this.startSignaling_();
};
Call.prototype.getPeerConnectionStates = function() {
  if (!this.pcClient_) {
    return null;
  }
  return this.pcClient_.getPeerConnectionStates();
};
Call.prototype.getPeerConnectionStats = function(callback) {
  if (!this.pcClient_) {
    return;
  }
  this.pcClient_.getPeerConnectionStats(callback);
};
Call.prototype.toggleVideoMute = function() {
  var videoTracks = this.localStream_.getVideoTracks();
  if (videoTracks.length === 0) {
    trace("No local video available.");
    return;
  }
  trace("Toggling video mute state.");
  for (var i = 0;i < videoTracks.length;++i) {
    videoTracks[i].enabled = !videoTracks[i].enabled;
  }
  this.pcClient_.sendCallstatsEvents(videoTracks[0].enabled ? "videoResume" : "videoPause");
  trace("Video " + (videoTracks[0].enabled ? "unmuted." : "muted."));
};
Call.prototype.toggleAudioMute = function() {
  var audioTracks = this.localStream_.getAudioTracks();
  if (audioTracks.length === 0) {
    trace("No local audio available.");
    return;
  }
  trace("Toggling audio mute state.");
  for (var i = 0;i < audioTracks.length;++i) {
    audioTracks[i].enabled = !audioTracks[i].enabled;
  }
  this.pcClient_.sendCallstatsEvents(audioTracks[0].enabled ? "audioUnmute" : "audioMute");
  trace("Audio " + (audioTracks[0].enabled ? "unmuted." : "muted."));
};
Call.prototype.connectToRoom_ = function(roomId) {
  this.params_.roomId = roomId;
  var channelPromise = this.channel_.open()["catch"](function(error) {
    this.onError_("WebSocket open error: " + error.message);
    return Promise.reject(error);
  }.bind(this));
  var joinPromise = this.joinRoom_().then(function(roomParams) {
    this.params_.clientId = roomParams.client_id;
    this.params_.roomId = roomParams.room_id;
    this.params_.roomLink = roomParams.room_link;
    this.params_.isInitiator = roomParams.is_initiator === "true";
    this.params_.messages = roomParams.messages;
  }.bind(this))["catch"](function(error) {
    this.onError_("Room server join error: " + error.message);
    return Promise.reject(error);
  }.bind(this));
  Promise.all([channelPromise, joinPromise]).then(function() {
    this.channel_.register(this.params_.roomId, this.params_.clientId);
    Promise.all([this.getIceServersPromise_, this.getMediaPromise_]).then(function() {
      this.startSignaling_();
      if (isChromeApp()) {
        this.queueCleanupMessages_();
      }
    }.bind(this))["catch"](function(error) {
      this.onError_("Failed to start signaling: " + error.message);
    }.bind(this));
  }.bind(this))["catch"](function(error) {
    this.onError_("WebSocket register error: " + error.message);
  }.bind(this));
};
Call.prototype.maybeGetMedia_ = function() {
  var needStream = this.params_.mediaConstraints.audio !== false || this.params_.mediaConstraints.video !== false;
  var mediaPromise = null;
  if (needStream) {
    var mediaConstraints = this.params_.mediaConstraints;
    mediaPromise = navigator.mediaDevices.getUserMedia(mediaConstraints)["catch"](function(error) {
      if (error.name !== "NotFoundError") {
        throw error;
      }
      return navigator.mediaDevices.enumerateDevices().then(function(devices) {
        var cam = devices.find(function(device) {
          return device.kind === "videoinput";
        });
        var mic = devices.find(function(device) {
          return device.kind === "audioinput";
        });
        var constraints = {video:cam && mediaConstraints.video, audio:mic && mediaConstraints.audio};
        return navigator.mediaDevices.getUserMedia(constraints);
      });
    }).then(function(stream) {
      trace("Got access to local media with mediaConstraints:\n" + "  '" + JSON.stringify(mediaConstraints) + "'");
      this.onUserMediaSuccess_(stream);
    }.bind(this))["catch"](function(error) {
      this.onError_("Error getting user media: " + error.message);
      this.onUserMediaError_(error);
    }.bind(this));
  } else {
    mediaPromise = Promise.resolve();
  }
  return mediaPromise;
};
Call.prototype.maybeGetIceServers_ = function() {
  var shouldRequestIceServers = this.params_.iceServerRequestUrl && this.params_.iceServerRequestUrl.length > 0 && this.params_.turnServerOverride && this.params_.turnServerOverride.length === 0;
  var iceServerPromise = null;
  if (shouldRequestIceServers) {
    var requestUrl = this.params_.iceServerRequestUrl;
    iceServerPromise = requestIceServers(requestUrl, this.params_.iceServerTransports).then(function(iceServers) {
      var servers = this.params_.peerConnectionConfig.iceServers;
      this.params_.peerConnectionConfig.iceServers = servers.concat(iceServers);
    }.bind(this))["catch"](function(error) {
      if (this.onstatusmessage) {
        var subject = encodeURIComponent("AppRTC demo ICE servers not working");
        this.onstatusmessage("No TURN server; unlikely that media will traverse networks. " + "If this persists please " + '<a href="mailto:discuss-webrtc@googlegroups.com?' + "subject=" + subject + '">' + "report it to discuss-webrtc@googlegroups.com</a>.");
      }
      trace(error.message);
    }.bind(this));
  } else {
    if (this.params_.turnServerOverride && this.params_.turnServerOverride.length === 0) {
      iceServerPromise = Promise.resolve();
    } else {
      iceServerPromise = new Promise(function(resolve) {
        this.params_.peerConnectionConfig.iceServers = this.params_.turnServerOverride;
        resolve();
      }.bind(this));
    }
  }
  return iceServerPromise;
};
Call.prototype.onUserMediaSuccess_ = function(stream) {
  this.localStream_ = stream;
  if (this.onlocalstreamadded) {
    this.onlocalstreamadded(stream);
  }
};
Call.prototype.onUserMediaError_ = function(error) {
  var errorMessage = "Failed to get access to local media. Error name was " + error.name + ". Continuing without sending a stream.";
  this.onError_("getUserMedia error: " + errorMessage);
  this.errorMessageQueue_.push(error);
  alert(errorMessage);
};
Call.prototype.maybeReportGetUserMediaErrors_ = function() {
  if (this.errorMessageQueue_.length > 0) {
    for (var errorMsg = 0;errorMsg < this.errorMessageQueue_.length;errorMsg++) {
      this.pcClient_.reportErrorToCallstats("getUserMedia", this.errorMessageQueue_[errorMsg]);
    }
  }
};
Call.prototype.maybeCreatePcClientAsync_ = function() {
  return new Promise(function(resolve, reject) {
    if (this.pcClient_) {
      resolve();
      return;
    }
    if (typeof RTCPeerConnection.generateCertificate === "function") {
      var certParams = {name:"ECDSA", namedCurve:"P-256"};
      RTCPeerConnection.generateCertificate(certParams).then(function(cert) {
        trace("ECDSA certificate generated successfully.");
        this.params_.peerConnectionConfig.certificates = [cert];
        this.createPcClient_();
        resolve();
      }.bind(this))["catch"](function(error) {
        trace("ECDSA certificate generation failed.");
        reject(error);
      });
    } else {
      this.createPcClient_();
      resolve();
    }
  }.bind(this));
};
Call.prototype.createPcClient_ = function() {
  this.pcClient_ = new PeerConnectionClient(this.params_, this.startTime);
  this.pcClient_.onsignalingmessage = this.sendSignalingMessage_.bind(this);
  this.pcClient_.onremotehangup = this.onremotehangup;
  this.pcClient_.onremotesdpset = this.onremotesdpset;
  this.pcClient_.onremotestreamadded = this.onremotestreamadded;
  this.pcClient_.onsignalingstatechange = this.onsignalingstatechange;
  this.pcClient_.oniceconnectionstatechange = this.oniceconnectionstatechange;
  this.pcClient_.onnewicecandidate = this.onnewicecandidate;
  this.pcClient_.onerror = this.onerror;
  trace("Created PeerConnectionClient");
};
Call.prototype.startSignaling_ = function() {
  trace("Starting signaling.");
  if (this.isInitiator() && this.oncallerstarted) {
    this.oncallerstarted(this.params_.roomId, this.params_.roomLink);
  }
  this.startTime = window.performance.now();
  this.maybeCreatePcClientAsync_().then(function() {
    if (this.localStream_) {
      trace("Adding local stream.");
      this.pcClient_.addStream(this.localStream_);
    }
    if (this.params_.isInitiator) {
      this.pcClient_.startAsCaller(this.params_.offerOptions);
    } else {
      this.pcClient_.startAsCallee(this.params_.messages);
    }
    this.maybeReportGetUserMediaErrors_();
  }.bind(this))["catch"](function(e) {
    this.onError_("Create PeerConnection exception: " + e);
    alert("Cannot create RTCPeerConnection: " + e.message);
  }.bind(this));
};
Call.prototype.joinRoom_ = function() {
  return new Promise(function(resolve, reject) {
    if (!this.params_.roomId) {
      reject(Error("Missing room id."));
    }
    var path = this.roomServer_ + "/join/" + this.params_.roomId + window.location.search;
    sendAsyncUrlRequest("POST", path).then(function(response) {
      var responseObj = parseJSON(response);
      if (!responseObj) {
        reject(Error("Error parsing response JSON."));
        return;
      }
      if (responseObj.result !== "SUCCESS") {
        reject(Error("Registration error: " + responseObj.result));
        if (responseObj.result === "FULL") {
          var getPath = this.roomServer_ + "/r/" + this.params_.roomId + window.location.search;
          window.location.assign(getPath);
        }
        return;
      }
      trace("Joined the room.");
      resolve(responseObj.params);
    }.bind(this))["catch"](function(error) {
      reject(Error("Failed to join the room: " + error.message));
      return;
    }.bind(this));
  }.bind(this));
};
Call.prototype.onRecvSignalingChannelMessage_ = function(msg) {
  this.maybeCreatePcClientAsync_().then(this.pcClient_.receiveSignalingMessage(msg));
};
Call.prototype.sendSignalingMessage_ = function(message) {
  var msgString = JSON.stringify(message);
  if (this.params_.isInitiator) {
    var path = this.roomServer_ + "/message/" + this.params_.roomId + "/" + this.params_.clientId + window.location.search;
    var xhr = new XMLHttpRequest;
    xhr.open("POST", path, true);
    xhr.send(msgString);
    trace("C->GAE: " + msgString);
  } else {
    this.channel_.send(msgString);
  }
};
Call.prototype.onError_ = function(message) {
  if (this.onerror) {
    this.onerror(message);
  }
};
var Constants = {WS_ACTION:"ws", XHR_ACTION:"xhr", QUEUEADD_ACTION:"addToQueue", QUEUECLEAR_ACTION:"clearQueue", EVENT_ACTION:"event", WS_CREATE_ACTION:"create", WS_EVENT_ONERROR:"onerror", WS_EVENT_ONMESSAGE:"onmessage", WS_EVENT_ONOPEN:"onopen", WS_EVENT_ONCLOSE:"onclose", WS_EVENT_SENDERROR:"onsenderror", WS_SEND_ACTION:"send", WS_CLOSE_ACTION:"close"};
var InfoBox = function(infoDiv, remoteVideo, call, versionInfo) {
  this.infoDiv_ = infoDiv;
  this.remoteVideo_ = remoteVideo;
  this.call_ = call;
  this.versionInfo_ = versionInfo;
  this.errorMessages_ = [];
  this.warningMessages_ = [];
  this.startTime_ = null;
  this.connectTime_ = null;
  this.stats_ = null;
  this.prevStats_ = null;
  this.getStatsTimer_ = null;
  this.iceCandidateTypes_ = {Local:{}, Remote:{}};
};
InfoBox.prototype.recordIceCandidateTypes = function(location, candidate) {
  var type = iceCandidateType(candidate);
  var types = this.iceCandidateTypes_[location];
  if (!types[type]) {
    types[type] = 1;
  } else {
    ++types[type];
  }
  this.updateInfoDiv();
};
InfoBox.prototype.pushErrorMessage = function(msg) {
  this.errorMessages_.push(msg);
  this.updateInfoDiv();
  this.showInfoDiv();
};
InfoBox.prototype.pushWarningMessage = function(msg) {
  this.warningMessages_.push(msg);
  this.updateInfoDiv();
  this.showInfoDiv();
};
InfoBox.prototype.setSetupTimes = function(startTime, connectTime) {
  this.startTime_ = startTime;
  this.connectTime_ = connectTime;
};
InfoBox.prototype.showInfoDiv = function() {
  this.getStatsTimer_ = setInterval(this.refreshStats_.bind(this), 1E3);
  this.refreshStats_();
  this.infoDiv_.classList.add("active");
};
InfoBox.prototype.toggleInfoDiv = function() {
  if (this.infoDiv_.classList.contains("active")) {
    clearInterval(this.getStatsTimer_);
    this.infoDiv_.classList.remove("active");
  } else {
    this.showInfoDiv();
  }
};
InfoBox.prototype.refreshStats_ = function() {
  this.call_.getPeerConnectionStats(function(response) {
    this.prevStats_ = this.stats_;
    this.stats_ = response;
    this.updateInfoDiv();
  }.bind(this));
};
InfoBox.prototype.updateInfoDiv = function() {
  var contents = '<pre id="info-box-stats" style="line-height: initial">';
  if (this.stats_) {
    var states = this.call_.getPeerConnectionStates();
    if (!states) {
      return;
    }
    contents += this.buildLine_("States");
    contents += this.buildLine_("Signaling", states.signalingState);
    contents += this.buildLine_("Gathering", states.iceGatheringState);
    contents += this.buildLine_("Connection", states.iceConnectionState);
    for (var endpoint in this.iceCandidateTypes_) {
      var types = [];
      for (var type in this.iceCandidateTypes_[endpoint]) {
        types.push(type + ":" + this.iceCandidateTypes_[endpoint][type]);
      }
      contents += this.buildLine_(endpoint, types.join(" "));
    }
    var activeCandPair = getStatsReport(this.stats_, "googCandidatePair", "googActiveConnection", "true");
    var localAddr;
    var remoteAddr;
    var localAddrType;
    var remoteAddrType;
    if (activeCandPair) {
      localAddr = activeCandPair.googLocalAddress;
      remoteAddr = activeCandPair.googRemoteAddress;
      localAddrType = activeCandPair.googLocalCandidateType;
      remoteAddrType = activeCandPair.googRemoteCandidateType;
    }
    if (localAddr && remoteAddr) {
      var localCandId = activeCandPair.localCandidateId;
      var localCand;
      var localTypePref;
      if (localCandId) {
        localCand = getStatsReport(this.stats_, "localcandidate", "id", localCandId);
        if (localCand) {
          localTypePref = localCand.priority >> 24;
        }
      }
      contents += this.buildLine_("LocalAddr", localAddr + " (" + localAddrType + (localTypePref !== undefined ? " " + formatTypePreference(localTypePref) : "") + ")");
      contents += this.buildLine_("RemoteAddr", remoteAddr + " (" + remoteAddrType + ")");
    }
    contents += this.buildLine_();
    contents += this.buildStatsSection_();
  }
  if (this.errorMessages_.length > 0 || this.warningMessages_.length > 0) {
    contents += this.buildLine_("\nMessages");
    if (this.errorMessages_.length) {
      this.infoDiv_.classList.add("warning");
      for (var i = 0;i !== this.errorMessages_.length;++i) {
        contents += this.errorMessages_[i] + "\n";
      }
    } else {
      this.infoDiv_.classList.add("active");
      for (var j = 0;j !== this.warningMessages_.length;++j) {
        contents += this.warningMessages_[j] + "\n";
      }
    }
  } else {
    this.infoDiv_.classList.remove("warning");
  }
  if (this.versionInfo_) {
    contents += this.buildLine_();
    contents += this.buildLine_("Version");
    for (var key in this.versionInfo_) {
      contents += this.buildLine_(key, this.versionInfo_[key]);
    }
  }
  contents += "</pre>";
  if (this.infoDiv_.innerHTML !== contents) {
    this.infoDiv_.innerHTML = contents;
  }
};
InfoBox.prototype.buildStatsSection_ = function() {
  var contents = this.buildLine_("Stats");
  var rtt = extractStatAsInt(this.stats_, "ssrc", "googRtt");
  var captureStart = extractStatAsInt(this.stats_, "ssrc", "googCaptureStartNtpTimeMs");
  var e2eDelay = computeE2EDelay(captureStart, this.remoteVideo_.currentTime);
  if (this.endTime_ !== null) {
    contents += this.buildLine_("Call time", InfoBox.formatInterval_(window.performance.now() - this.connectTime_));
    contents += this.buildLine_("Setup time", InfoBox.formatMsec_(this.connectTime_ - this.startTime_));
  }
  if (rtt !== null) {
    contents += this.buildLine_("RTT", InfoBox.formatMsec_(rtt));
  }
  if (e2eDelay !== null) {
    contents += this.buildLine_("End to end", InfoBox.formatMsec_(e2eDelay));
  }
  var txAudio = getStatsReport(this.stats_, "ssrc", "audioInputLevel");
  var rxAudio = getStatsReport(this.stats_, "ssrc", "audioOutputLevel");
  var txVideo = getStatsReport(this.stats_, "ssrc", "googFirsReceived");
  var rxVideo = getStatsReport(this.stats_, "ssrc", "googFirsSent");
  var txPrevAudio = getStatsReport(this.prevStats_, "ssrc", "audioInputLevel");
  var rxPrevAudio = getStatsReport(this.prevStats_, "ssrc", "audioOutputLevel");
  var txPrevVideo = getStatsReport(this.prevStats_, "ssrc", "googFirsReceived");
  var rxPrevVideo = getStatsReport(this.prevStats_, "ssrc", "googFirsSent");
  var txAudioCodec;
  var txAudioBitrate;
  var txAudioPacketRate;
  var rxAudioCodec;
  var rxAudioBitrate;
  var rxAudioPacketRate;
  var txVideoHeight;
  var txVideoFps;
  var txVideoCodec;
  var txVideoBitrate;
  var txVideoPacketRate;
  var rxVideoHeight;
  var rxVideoFps;
  var rxVideoCodec;
  var rxVideoBitrate;
  var rxVideoPacketRate;
  if (txAudio) {
    txAudioCodec = txAudio.googCodecName;
    txAudioBitrate = computeBitrate(txAudio, txPrevAudio, "bytesSent");
    txAudioPacketRate = computeRate(txAudio, txPrevAudio, "packetsSent");
    contents += this.buildLine_("Audio Tx", txAudioCodec + ", " + InfoBox.formatBitrate_(txAudioBitrate) + ", " + InfoBox.formatPacketRate_(txAudioPacketRate));
  }
  if (rxAudio) {
    rxAudioCodec = rxAudio.googCodecName;
    rxAudioBitrate = computeBitrate(rxAudio, rxPrevAudio, "bytesReceived");
    rxAudioPacketRate = computeRate(rxAudio, rxPrevAudio, "packetsReceived");
    contents += this.buildLine_("Audio Rx", rxAudioCodec + ", " + InfoBox.formatBitrate_(rxAudioBitrate) + ", " + InfoBox.formatPacketRate_(rxAudioPacketRate));
  }
  if (txVideo) {
    txVideoCodec = txVideo.googCodecName;
    txVideoHeight = txVideo.googFrameHeightSent;
    txVideoFps = txVideo.googFrameRateSent;
    txVideoBitrate = computeBitrate(txVideo, txPrevVideo, "bytesSent");
    txVideoPacketRate = computeRate(txVideo, txPrevVideo, "packetsSent");
    contents += this.buildLine_("Video Tx", txVideoCodec + ", " + txVideoHeight.toString() + "p" + txVideoFps.toString() + ", " + InfoBox.formatBitrate_(txVideoBitrate) + ", " + InfoBox.formatPacketRate_(txVideoPacketRate));
  }
  if (rxVideo) {
    rxVideoCodec = rxVideo.googCodecName;
    rxVideoHeight = this.remoteVideo_.videoHeight;
    rxVideoFps = rxVideo.googFrameRateDecoded;
    rxVideoBitrate = computeBitrate(rxVideo, rxPrevVideo, "bytesReceived");
    rxVideoPacketRate = computeRate(rxVideo, rxPrevVideo, "packetsReceived");
    contents += this.buildLine_("Video Rx", rxVideoCodec + ", " + rxVideoHeight.toString() + "p" + rxVideoFps.toString() + ", " + InfoBox.formatBitrate_(rxVideoBitrate) + ", " + InfoBox.formatPacketRate_(rxVideoPacketRate));
  }
  return contents;
};
InfoBox.prototype.buildLine_ = function(label, value) {
  var columnWidth = 12;
  var line = "";
  if (label) {
    line += label + ":";
    while (line.length < columnWidth) {
      line += " ";
    }
    if (value) {
      line += value;
    }
  }
  line += "\n";
  return line;
};
InfoBox.formatInterval_ = function(value) {
  var result = "";
  var seconds = Math.floor(value / 1E3);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var formatTwoDigit = function(twodigit) {
    return (twodigit < 10 ? "0" : "") + twodigit.toString();
  };
  if (hours > 0) {
    result += formatTwoDigit(hours) + ":";
  }
  result += formatTwoDigit(minutes - hours * 60) + ":";
  result += formatTwoDigit(seconds - minutes * 60);
  return result;
};
InfoBox.formatMsec_ = function(value) {
  return value.toFixed(0).toString() + " ms";
};
InfoBox.formatBitrate_ = function(value) {
  if (!value) {
    return "- bps";
  }
  var suffix;
  if (value < 1E3) {
    suffix = "bps";
  } else {
    if (value < 1E6) {
      suffix = "kbps";
      value /= 1E3;
    } else {
      suffix = "Mbps";
      value /= 1E6;
    }
  }
  var str = value.toPrecision(3) + " " + suffix;
  return str;
};
InfoBox.formatPacketRate_ = function(value) {
  if (!value) {
    return "- pps";
  }
  return value.toPrecision(3) + " " + "pps";
};
var PeerConnectionClient = function(params, startTime) {
  this.params_ = params;
  this.startTime_ = startTime;
  trace("Creating RTCPeerConnnection with:\n" + "  config: '" + JSON.stringify(params.peerConnectionConfig) + "';\n" + "  constraints: '" + JSON.stringify(params.peerConnectionConstraints) + "'.");
  this.pc_ = new RTCPeerConnection(params.peerConnectionConfig, params.peerConnectionConstraints);
  this.pc_.onicecandidate = this.onIceCandidate_.bind(this);
  this.pc_.ontrack = this.onRemoteStreamAdded_.bind(this);
  this.pc_.onremovestream = trace.bind(null, "Remote stream removed.");
  this.pc_.onsignalingstatechange = this.onSignalingStateChanged_.bind(this);
  this.pc_.oniceconnectionstatechange = this.onIceConnectionStateChanged_.bind(this);
  window.dispatchEvent(new CustomEvent("pccreated", {detail:{pc:this, time:new Date, userId:this.params_.roomId + (this.isInitiator_ ? "-0" : "-1"), sessionId:this.params_.roomId}}));
  this.hasRemoteSdp_ = false;
  this.messageQueue_ = [];
  this.isInitiator_ = false;
  this.started_ = false;
  this.onerror = null;
  this.oniceconnectionstatechange = null;
  this.onnewicecandidate = null;
  this.onremotehangup = null;
  this.onremotesdpset = null;
  this.onremotestreamadded = null;
  this.onsignalingmessage = null;
  this.onsignalingstatechange = null;
  this.callstatsInit = false;
};
PeerConnectionClient.DEFAULT_SDP_OFFER_OPTIONS_ = {offerToReceiveAudio:1, offerToReceiveVideo:1, voiceActivityDetection:false};
PeerConnectionClient.prototype.addStream = function(stream) {
  if (!this.pc_) {
    return;
  }
  this.pc_.addStream(stream);
};
PeerConnectionClient.prototype.startAsCaller = function(offerOptions) {
  if (!this.pc_) {
    return false;
  }
  if (this.started_) {
    return false;
  }
  this.isInitiator_ = true;
  this.setupCallstats_();
  this.started_ = true;
  var constraints = mergeConstraints(PeerConnectionClient.DEFAULT_SDP_OFFER_OPTIONS_, offerOptions);
  trace("Sending offer to peer, with constraints: \n'" + JSON.stringify(constraints) + "'.");
  this.pc_.createOffer(constraints).then(this.setLocalSdpAndNotify_.bind(this))["catch"](this.onError_.bind(this, "createOffer"));
  return true;
};
PeerConnectionClient.prototype.startAsCallee = function(initialMessages) {
  if (!this.pc_) {
    return false;
  }
  if (this.started_) {
    return false;
  }
  this.isInitiator_ = false;
  this.setupCallstats_();
  this.started_ = true;
  if (initialMessages && initialMessages.length > 0) {
    for (var i = 0, len = initialMessages.length;i < len;i++) {
      this.receiveSignalingMessage(initialMessages[i]);
    }
    return true;
  }
  if (this.messageQueue_.length > 0) {
    this.drainMessageQueue_();
  }
  return true;
};
PeerConnectionClient.prototype.receiveSignalingMessage = function(message) {
  var messageObj = parseJSON(message);
  if (!messageObj) {
    return;
  }
  if (this.isInitiator_ && messageObj.type === "answer" || !this.isInitiator_ && messageObj.type === "offer") {
    this.hasRemoteSdp_ = true;
    this.messageQueue_.unshift(messageObj);
  } else {
    if (messageObj.type === "candidate") {
      this.messageQueue_.push(messageObj);
    } else {
      if (messageObj.type === "bye") {
        if (this.onremotehangup) {
          this.onremotehangup();
        }
      }
    }
  }
  this.drainMessageQueue_();
};
PeerConnectionClient.prototype.close = function() {
  if (!this.pc_) {
    return;
  }
  this.sendCallstatsEvents("fabricTerminated");
  this.pc_.close();
  window.dispatchEvent(new CustomEvent("pcclosed", {detail:{pc:this, time:new Date}}));
  this.pc_ = null;
  this.callstatsInit = false;
};
PeerConnectionClient.prototype.getPeerConnectionStates = function() {
  if (!this.pc_) {
    return null;
  }
  return {"signalingState":this.pc_.signalingState, "iceGatheringState":this.pc_.iceGatheringState, "iceConnectionState":this.pc_.iceConnectionState};
};
PeerConnectionClient.prototype.getPeerConnectionStats = function(callback) {
  if (!this.pc_) {
    return;
  }
  this.pc_.getStats(null).then(callback);
};
PeerConnectionClient.prototype.doAnswer_ = function() {
  trace("Sending answer to peer.");
  this.pc_.createAnswer().then(this.setLocalSdpAndNotify_.bind(this))["catch"](this.onError_.bind(this, "createAnswer"));
};
PeerConnectionClient.prototype.setLocalSdpAndNotify_ = function(sessionDescription) {
  sessionDescription.sdp = maybePreferAudioReceiveCodec(sessionDescription.sdp, this.params_);
  sessionDescription.sdp = maybePreferVideoReceiveCodec(sessionDescription.sdp, this.params_);
  sessionDescription.sdp = maybeSetAudioReceiveBitRate(sessionDescription.sdp, this.params_);
  sessionDescription.sdp = maybeSetVideoReceiveBitRate(sessionDescription.sdp, this.params_);
  sessionDescription.sdp = maybeRemoveVideoFec(sessionDescription.sdp, this.params_);
  this.pc_.setLocalDescription(sessionDescription).then(trace.bind(null, "Set session description success."))["catch"](this.onError_.bind(this, "setLocalDescription"));
  if (this.onsignalingmessage) {
    this.onsignalingmessage({sdp:sessionDescription.sdp, type:sessionDescription.type});
  }
};
PeerConnectionClient.prototype.setRemoteSdp_ = function(message) {
  message.sdp = maybeSetOpusOptions(message.sdp, this.params_);
  message.sdp = maybePreferAudioSendCodec(message.sdp, this.params_);
  message.sdp = maybePreferVideoSendCodec(message.sdp, this.params_);
  message.sdp = maybeSetAudioSendBitRate(message.sdp, this.params_);
  message.sdp = maybeSetVideoSendBitRate(message.sdp, this.params_);
  message.sdp = maybeSetVideoSendInitialBitRate(message.sdp, this.params_);
  message.sdp = maybeRemoveVideoFec(message.sdp, this.params_);
  this.pc_.setRemoteDescription(new RTCSessionDescription(message)).then(this.onSetRemoteDescriptionSuccess_.bind(this))["catch"](this.onError_.bind(this, "setRemoteDescription"));
};
PeerConnectionClient.prototype.onSetRemoteDescriptionSuccess_ = function() {
  trace("Set remote session description success.");
  var remoteStreams = this.pc_.getRemoteStreams();
  if (this.onremotesdpset) {
    this.onremotesdpset(remoteStreams.length > 0 && remoteStreams[0].getVideoTracks().length > 0);
  }
};
PeerConnectionClient.prototype.processSignalingMessage_ = function(message) {
  if (message.type === "offer" && !this.isInitiator_) {
    if (this.pc_.signalingState !== "stable") {
      trace("ERROR: remote offer received in unexpected state: " + this.pc_.signalingState);
      return;
    }
    this.setRemoteSdp_(message);
    this.doAnswer_();
  } else {
    if (message.type === "answer" && this.isInitiator_) {
      if (this.pc_.signalingState !== "have-local-offer") {
        trace("ERROR: remote answer received in unexpected state: " + this.pc_.signalingState);
        return;
      }
      this.setRemoteSdp_(message);
    } else {
      if (message.type === "candidate") {
        var candidate = new RTCIceCandidate({sdpMLineIndex:message.label, candidate:message.candidate});
        this.recordIceCandidate_("Remote", candidate);
        this.pc_.addIceCandidate(candidate).then(trace.bind(null, "Remote candidate added successfully."))["catch"](this.onError_.bind(this, "addIceCandidate"));
      } else {
        trace("WARNING: unexpected message: " + JSON.stringify(message));
      }
    }
  }
};
PeerConnectionClient.prototype.drainMessageQueue_ = function() {
  if (!this.pc_ || !this.started_ || !this.hasRemoteSdp_) {
    return;
  }
  for (var i = 0, len = this.messageQueue_.length;i < len;i++) {
    this.processSignalingMessage_(this.messageQueue_[i]);
  }
  this.messageQueue_ = [];
};
PeerConnectionClient.prototype.onIceCandidate_ = function(event) {
  if (event.candidate) {
    if (this.filterIceCandidate_(event.candidate)) {
      var message = {type:"candidate", label:event.candidate.sdpMLineIndex, id:event.candidate.sdpMid, candidate:event.candidate.candidate};
      if (this.onsignalingmessage) {
        this.onsignalingmessage(message);
      }
      this.recordIceCandidate_("Local", event.candidate);
    }
  } else {
    trace("End of candidates.");
  }
};
PeerConnectionClient.prototype.onSignalingStateChanged_ = function() {
  if (!this.pc_) {
    return;
  }
  trace("Signaling state changed to: " + this.pc_.signalingState);
  if (this.onsignalingstatechange) {
    this.onsignalingstatechange();
  }
};
PeerConnectionClient.prototype.onIceConnectionStateChanged_ = function() {
  if (!this.pc_) {
    return;
  }
  trace("ICE connection state changed to: " + this.pc_.iceConnectionState);
  if (this.pc_.iceConnectionState === "completed") {
    trace("ICE complete time: " + (window.performance.now() - this.startTime_).toFixed(0) + "ms.");
  }
  if (this.oniceconnectionstatechange) {
    this.oniceconnectionstatechange();
  }
  if (this.pc_.iceConnectionState === "connected" && !this.isInitiator_ || this.pc_.iceConnectionState === "completed") {
    this.callStatsCommandQueue_.addToQueue(this.bindMstToUserIdForCallstats_.bind(this));
  }
};
PeerConnectionClient.prototype.filterIceCandidate_ = function(candidateObj) {
  var candidateStr = candidateObj.candidate;
  if (candidateStr.indexOf("tcp") !== -1) {
    return false;
  }
  if (this.params_.peerConnectionConfig.iceTransports === "relay" && iceCandidateType(candidateStr) !== "relay") {
    return false;
  }
  return true;
};
PeerConnectionClient.prototype.recordIceCandidate_ = function(location, candidateObj) {
  if (this.onnewicecandidate) {
    this.onnewicecandidate(location, candidateObj.candidate);
  }
};
PeerConnectionClient.prototype.onRemoteStreamAdded_ = function(event) {
  if (this.onremotestreamadded) {
    this.onremotestreamadded(event.streams[0]);
  }
};
PeerConnectionClient.prototype.onError_ = function(tag, error) {
  if (this.onerror) {
    this.onerror(tag + ": " + error.toString());
    this.reportErrorToCallstats(tag, error);
  }
};
PeerConnectionClient.prototype.isCallstatsInitialized_ = function() {
  if (!this.callstats || !this.callstatsInit) {
    trace("Callstats not initilized.");
    return false;
  }
  return true;
};
PeerConnectionClient.prototype.callStatsCommandQueue_ = {queue:[], addToQueue:function(command) {
  if (typeof command === "function") {
    this.queue.push(command);
  }
}, processQueue:function() {
  for (var i = 0;i < this.queue.length;i++) {
    var command = this.queue.pop();
    command();
  }
}};
PeerConnectionClient.prototype.reportErrorToCallstats = function(funcName, error) {
  if (!this.isCallstatsInitialized_()) {
    return;
  }
  var localSdp = this.pc_.localDescription.sdp || null;
  var remoteSdp = this.pc_.remoteDescription.sdp || null;
  var supportedWebrtcFuncNames = {getUserMedia:"getUserMedia", createOffer:"createOffer", createAnswer:"createAnswer", setLocalDescription:"setLocalDescription", setRemoteDescription:"setRemoteDescription", addIceCandidate:"addIceCandidate"};
  if (supportedWebrtcFuncNames[funcName]) {
    var filteredError = funcName === "getUserMedia" ? error.name : error;
    this.callstats.reportError(this.pc_, this.conferenceId, supportedWebrtcFuncNames[funcName], new DOMException(filteredError), localSdp, remoteSdp);
  }
};
PeerConnectionClient.prototype.initCallstats_ = function(successCallback) {
  trace("Init callstats.");
  var appId = this.params_.callstatsParams.appId;
  var appSecret = this.params_.callstatsParams.appSecret;
  if (!appId || appId === "none" || !appSecret || appSecret === "none") {
    trace("Could not init callstats due to missing App ID and/or API key");
    return;
  }
  if (typeof io !== "function" || typeof jsSHA !== "function") {
    trace("Callstats dependencies missing, stats will not be setup.");
    return;
  }
  this.callstats = new callstats(null, io, jsSHA);
  this.userId = this.params_.roomId + (this.isInitiator_ ? "-0" : "-1");
  var statsCallback = null;
  var configParams = {applicationVersion:this.params_.versionInfo.gitHash};
  var callback = function(status, msg) {
    if (!this.callstatsInit) {
      if (status === "httpError") {
        trace("Callstats could not be set up: " + msg);
        return;
      }
      successCallback();
    }
    trace("Init status: " + status + " msg: " + msg);
  }.bind(this);
  this.callstats.initialize(appId, appSecret, this.userId, callback, statsCallback, configParams);
};
PeerConnectionClient.prototype.setupCallstats_ = function() {
  try {
    var successCallback = function() {
      trace("Set up callstats.");
      this.conferenceId = this.params_.roomId;
      this.remoteUserId = this.params_.roomId + (this.isInitiator_ ? "-1" : "-0");
      var usage = this.callstats.fabricUsage.multiplex;
      var callback = function(status, msg) {
        this.callStatsCommandQueue_.processQueue();
        trace("Callstats status: " + status + " msg: " + msg);
      }.bind(this);
      this.callstats.addNewFabric(this.pc_, this.remoteUserId, usage, this.conferenceId, callback);
      this.callstatsInit = true;
    }.bind(this);
    this.initCallstats_(successCallback);
  } catch (error) {
    trace("Callstats could not be set up: " + error);
  }
};
PeerConnectionClient.prototype.bindMstToUserIdForCallstats_ = function() {
  if (!this.isCallstatsInitialized_() || !this.pc_ && !this.pc_.getLocalStreams && this.pc_.getLocalStreams().length === 0) {
    trace("Cannot associateMstWithUserID.");
    return;
  }
  var localVideoTagId = "mini-video";
  if (this.pc_.getLocalStreams()[0].getVideoTracks().length > 0 && this.pc_.localDescription) {
    var videoSendTrackId = this.pc_.getLocalStreams()[0].getVideoTracks()[0].id;
    var videoSendTrackLabel = this.pc_.getLocalStreams()[0].getVideoTracks()[0].label;
    var videoSendSsrcLine = this.pc_.localDescription.sdp.match("a=ssrc:.*." + videoSendTrackId);
    if (videoSendSsrcLine !== null) {
      var videoSendSsrc = videoSendSsrcLine[0].match("[0-9]+");
      this.callstats.associateMstWithUserID(this.pc_, this.userId, this.conferenceId, videoSendSsrc[0], videoSendTrackLabel, localVideoTagId);
    }
  }
  if (this.pc_.getLocalStreams()[0].getAudioTracks().length > 0 && this.pc_.localDescription) {
    var audioSendTrackId = this.pc_.getLocalStreams()[0].getAudioTracks()[0].id;
    var audioSendTrackLabel = this.pc_.getLocalStreams()[0].getAudioTracks()[0].label;
    var audioSendSsrcLine = this.pc_.localDescription.sdp.match("a=ssrc:.*." + audioSendTrackId);
    if (audioSendSsrcLine !== null) {
      var audioSendSsrc = audioSendSsrcLine[0].match("[0-9]+");
      this.callstats.associateMstWithUserID(this.pc_, this.userId, this.conferenceId, audioSendSsrc[0], audioSendTrackLabel, localVideoTagId);
    }
  }
  var remoteVideoTagId = "remote-video";
  if (this.pc_.getRemoteStreams()[0].getVideoTracks.length > 0 && this.pc_.remoteDescription) {
    var videoReceiveTrackId = this.pc_.getRemoteStreams()[0].getVideoTracks()[0].id;
    var videoReceiveTrackLabel = this.pc_.getRemoteStreams()[0].getVideoTracks()[0].label;
    var videoReceiveSsrcLine = this.pc_.remoteDescription.sdp.match("a=ssrc:.*." + videoReceiveTrackId);
    if (videoReceiveSsrcLine !== null) {
      var videoReceiveSsrc = videoReceiveSsrcLine[0].match("[0-9]+");
      this.callstats.associateMstWithUserID(this.pc_, this.remoteUserId, this.conferenceId, videoReceiveSsrc[0], videoReceiveTrackLabel, remoteVideoTagId);
    }
  }
  if (this.pc_.getRemoteStreams()[0].getAudioTracks.length > 0 && this.pc_.remoteDescription) {
    var audioReceiveTrackId = this.pc_.getRemoteStreams()[0].getAudioTracks()[0].id;
    var audioReceiveTrackLabel = this.pc_.getRemoteStreams()[0].getAudioTracks()[0].label;
    var audioReceiveSsrcLine = this.pc_.remoteDescription.sdp.match("a=ssrc:.*." + audioReceiveTrackId);
    if (audioReceiveSsrcLine !== null) {
      var audioReceiveSsrc = audioReceiveSsrcLine[0].match("[0-9]+");
      this.callstats.associateMstWithUserID(this.pc_, this.remoteUserId, this.conferenceId, audioReceiveSsrc[0], audioReceiveTrackLabel, remoteVideoTagId);
    }
  }
};
PeerConnectionClient.prototype.sendCallstatsEvents = function(fabricEvent) {
  if (!this.isCallstatsInitialized_()) {
    return;
  } else {
    if (!fabricEvent) {
      trace("Must provide a fabricEvent.");
      return;
    }
  }
  this.callstats.sendFabricEvent(this.pc_, fabricEvent, this.conferenceId);
};
var RemoteWebSocket = function(wssUrl, wssPostUrl) {
  this.wssUrl_ = wssUrl;
  apprtc.windowPort.addMessageListener(this.handleMessage_.bind(this));
  this.sendMessage_({action:Constants.WS_ACTION, wsAction:Constants.WS_CREATE_ACTION, wssUrl:wssUrl, wssPostUrl:wssPostUrl});
  this.readyState = WebSocket.CONNECTING;
};
RemoteWebSocket.prototype.sendMessage_ = function(message) {
  apprtc.windowPort.sendMessage(message);
};
RemoteWebSocket.prototype.send = function(data) {
  if (this.readyState !== WebSocket.OPEN) {
    throw "Web socket is not in OPEN state: " + this.readyState;
  }
  this.sendMessage_({action:Constants.WS_ACTION, wsAction:Constants.WS_SEND_ACTION, data:data});
};
RemoteWebSocket.prototype.close = function() {
  if (this.readyState === WebSocket.CLOSING || this.readyState === WebSocket.CLOSED) {
    return;
  }
  this.readyState = WebSocket.CLOSING;
  this.sendMessage_({action:Constants.WS_ACTION, wsAction:Constants.WS_CLOSE_ACTION});
};
RemoteWebSocket.prototype.handleMessage_ = function(message) {
  if (message.action === Constants.WS_ACTION && message.wsAction === Constants.EVENT_ACTION) {
    if (message.wsEvent === Constants.WS_EVENT_ONOPEN) {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen();
      }
    } else {
      if (message.wsEvent === Constants.WS_EVENT_ONCLOSE) {
        this.readyState = WebSocket.CLOSED;
        if (this.onclose) {
          this.onclose(message.data);
        }
      } else {
        if (message.wsEvent === Constants.WS_EVENT_ONERROR) {
          if (this.onerror) {
            this.onerror(message.data);
          }
        } else {
          if (message.wsEvent === Constants.WS_EVENT_ONMESSAGE) {
            if (this.onmessage) {
              this.onmessage(message.data);
            }
          } else {
            if (message.wsEvent === Constants.WS_EVENT_SENDERROR) {
              if (this.onsenderror) {
                this.onsenderror(message.data);
              }
              trace("ERROR: web socket send failed: " + message.data);
            }
          }
        }
      }
    }
  }
};
var RoomSelection = function(roomSelectionDiv, uiConstants, recentRoomsKey, setupCompletedCallback) {
  this.roomSelectionDiv_ = roomSelectionDiv;
  this.setupCompletedCallback_ = setupCompletedCallback;
  this.roomIdInput_ = this.roomSelectionDiv_.querySelector(uiConstants.roomSelectionInput);
  this.roomIdInputLabel_ = this.roomSelectionDiv_.querySelector(uiConstants.roomSelectionInputLabel);
  this.roomJoinButton_ = this.roomSelectionDiv_.querySelector(uiConstants.roomSelectionJoinButton);
  this.roomRandomButton_ = this.roomSelectionDiv_.querySelector(uiConstants.roomSelectionRandomButton);
  this.roomRecentList_ = this.roomSelectionDiv_.querySelector(uiConstants.roomSelectionRecentList);
  this.roomIdInput_.value = randomString(9);
  this.onRoomIdInput_();
  this.roomIdInputListener_ = this.onRoomIdInput_.bind(this);
  this.roomIdInput_.addEventListener("input", this.roomIdInputListener_, false);
  this.roomIdKeyupListener_ = this.onRoomIdKeyPress_.bind(this);
  this.roomIdInput_.addEventListener("keyup", this.roomIdKeyupListener_, false);
  this.roomRandomButtonListener_ = this.onRandomButton_.bind(this);
  this.roomRandomButton_.addEventListener("click", this.roomRandomButtonListener_, false);
  this.roomJoinButtonListener_ = this.onJoinButton_.bind(this);
  this.roomJoinButton_.addEventListener("click", this.roomJoinButtonListener_, false);
  this.onRoomSelected = null;
  this.recentlyUsedList_ = new RoomSelection.RecentlyUsedList(recentRoomsKey);
  this.startBuildingRecentRoomList_();
};
RoomSelection.matchRandomRoomPattern = function(input) {
  return input.match(/^\d{9}$/) !== null;
};
RoomSelection.prototype.removeEventListeners = function() {
  this.roomIdInput_.removeEventListener("input", this.roomIdInputListener_);
  this.roomIdInput_.removeEventListener("keyup", this.roomIdKeyupListener_);
  this.roomRandomButton_.removeEventListener("click", this.roomRandomButtonListener_);
  this.roomJoinButton_.removeEventListener("click", this.roomJoinButtonListener_);
};
RoomSelection.prototype.startBuildingRecentRoomList_ = function() {
  this.recentlyUsedList_.getRecentRooms().then(function(recentRooms) {
    this.buildRecentRoomList_(recentRooms);
    if (this.setupCompletedCallback_) {
      this.setupCompletedCallback_();
    }
  }.bind(this))["catch"](function(error) {
    trace("Error building recent rooms list: " + error.message);
  }.bind(this));
};
RoomSelection.prototype.buildRecentRoomList_ = function(recentRooms) {
  var lastChild = this.roomRecentList_.lastChild;
  while (lastChild) {
    this.roomRecentList_.removeChild(lastChild);
    lastChild = this.roomRecentList_.lastChild;
  }
  for (var i = 0;i < recentRooms.length;++i) {
    var li = document.createElement("li");
    var href = document.createElement("a");
    var linkText = document.createTextNode(recentRooms[i]);
    href.appendChild(linkText);
    href.href = location.origin + "/r/" + encodeURIComponent(recentRooms[i]);
    li.appendChild(href);
    this.roomRecentList_.appendChild(li);
    href.addEventListener("click", this.makeRecentlyUsedClickHandler_(recentRooms[i]).bind(this), false);
  }
};
RoomSelection.prototype.onRoomIdInput_ = function() {
  var room = this.roomIdInput_.value;
  var valid = room.length >= 5;
  var re = /^([a-zA-Z0-9-_]+)+$/;
  valid = valid && re.exec(room);
  if (valid) {
    this.roomJoinButton_.disabled = false;
    this.roomIdInput_.classList.remove("invalid");
    this.roomIdInputLabel_.classList.add("hidden");
  } else {
    this.roomJoinButton_.disabled = true;
    this.roomIdInput_.classList.add("invalid");
    this.roomIdInputLabel_.classList.remove("hidden");
  }
};
RoomSelection.prototype.onRoomIdKeyPress_ = function(event) {
  if (event.which !== 13 || this.roomJoinButton_.disabled) {
    return;
  }
  this.onJoinButton_();
};
RoomSelection.prototype.onRandomButton_ = function() {
  this.roomIdInput_.value = randomString(9);
  this.onRoomIdInput_();
};
RoomSelection.prototype.onJoinButton_ = function() {
  this.loadRoom_(this.roomIdInput_.value);
};
RoomSelection.prototype.makeRecentlyUsedClickHandler_ = function(roomName) {
  return function(e) {
    e.preventDefault();
    this.loadRoom_(roomName);
  };
};
RoomSelection.prototype.loadRoom_ = function(roomName) {
  this.recentlyUsedList_.pushRecentRoom(roomName);
  if (this.onRoomSelected) {
    this.onRoomSelected(roomName);
  }
};
RoomSelection.RecentlyUsedList = function(key) {
  this.LISTLENGTH_ = 10;
  this.RECENTROOMSKEY_ = key || "recentRooms";
  this.storage_ = new Storage;
};
RoomSelection.RecentlyUsedList.prototype.pushRecentRoom = function(roomId) {
  return new Promise(function(resolve, reject) {
    if (!roomId) {
      resolve();
      return;
    }
    this.getRecentRooms().then(function(recentRooms) {
      recentRooms = [roomId].concat(recentRooms);
      recentRooms = recentRooms.filter(function(value, index, self) {
        return self.indexOf(value) === index;
      });
      recentRooms = recentRooms.slice(0, this.LISTLENGTH_);
      this.storage_.setStorage(this.RECENTROOMSKEY_, JSON.stringify(recentRooms), function() {
        resolve();
      });
    }.bind(this))["catch"](function(err) {
      reject(err);
    }.bind(this));
  }.bind(this));
};
RoomSelection.RecentlyUsedList.prototype.getRecentRooms = function() {
  return new Promise(function(resolve) {
    this.storage_.getStorage(this.RECENTROOMSKEY_, function(value) {
      var recentRooms = parseJSON(value);
      if (!recentRooms) {
        recentRooms = [];
      }
      resolve(recentRooms);
    });
  }.bind(this));
};
function mergeConstraints(cons1, cons2) {
  if (!cons1 || !cons2) {
    return cons1 || cons2;
  }
  var merged = cons1;
  for (var key in cons2) {
    merged[key] = cons2[key];
  }
  return merged;
}
function iceCandidateType(candidateStr) {
  return candidateStr.split(" ")[7];
}
function formatTypePreference(pref) {
  if (adapter.browserDetails.browser === "chrome") {
    switch(pref) {
      case 0:
        return "TURN/TLS";
      case 1:
        return "TURN/TCP";
      case 2:
        return "TURN/UDP";
      default:
        break;
    }
  } else {
    if (adapter.browserDetails.browser === "firefox") {
      switch(pref) {
        case 0:
          return "TURN/TCP";
        case 5:
          return "TURN/UDP";
        default:
          break;
      }
    }
  }
  return "";
}
function maybeSetOpusOptions(sdp, params) {
  if (params.opusStereo === "true") {
    sdp = setCodecParam(sdp, "opus/48000", "stereo", "1");
  } else {
    if (params.opusStereo === "false") {
      sdp = removeCodecParam(sdp, "opus/48000", "stereo");
    }
  }
  if (params.opusFec === "true") {
    sdp = setCodecParam(sdp, "opus/48000", "useinbandfec", "1");
  } else {
    if (params.opusFec === "false") {
      sdp = removeCodecParam(sdp, "opus/48000", "useinbandfec");
    }
  }
  if (params.opusDtx === "true") {
    sdp = setCodecParam(sdp, "opus/48000", "usedtx", "1");
  } else {
    if (params.opusDtx === "false") {
      sdp = removeCodecParam(sdp, "opus/48000", "usedtx");
    }
  }
  if (params.opusMaxPbr) {
    sdp = setCodecParam(sdp, "opus/48000", "maxplaybackrate", params.opusMaxPbr);
  }
  return sdp;
}
function maybeSetAudioSendBitRate(sdp, params) {
  if (!params.audioSendBitrate) {
    return sdp;
  }
  trace("Prefer audio send bitrate: " + params.audioSendBitrate);
  return preferBitRate(sdp, params.audioSendBitrate, "audio");
}
function maybeSetAudioReceiveBitRate(sdp, params) {
  if (!params.audioRecvBitrate) {
    return sdp;
  }
  trace("Prefer audio receive bitrate: " + params.audioRecvBitrate);
  return preferBitRate(sdp, params.audioRecvBitrate, "audio");
}
function maybeSetVideoSendBitRate(sdp, params) {
  if (!params.videoSendBitrate) {
    return sdp;
  }
  trace("Prefer video send bitrate: " + params.videoSendBitrate);
  return preferBitRate(sdp, params.videoSendBitrate, "video");
}
function maybeSetVideoReceiveBitRate(sdp, params) {
  if (!params.videoRecvBitrate) {
    return sdp;
  }
  trace("Prefer video receive bitrate: " + params.videoRecvBitrate);
  return preferBitRate(sdp, params.videoRecvBitrate, "video");
}
function preferBitRate(sdp, bitrate, mediaType) {
  var sdpLines = sdp.split("\r\n");
  var mLineIndex = findLine(sdpLines, "m=", mediaType);
  if (mLineIndex === null) {
    trace("Failed to add bandwidth line to sdp, as no m-line found");
    return sdp;
  }
  var nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, "m=");
  if (nextMLineIndex === null) {
    nextMLineIndex = sdpLines.length;
  }
  var cLineIndex = findLineInRange(sdpLines, mLineIndex + 1, nextMLineIndex, "c=");
  if (cLineIndex === null) {
    trace("Failed to add bandwidth line to sdp, as no c-line found");
    return sdp;
  }
  var bLineIndex = findLineInRange(sdpLines, cLineIndex + 1, nextMLineIndex, "b=AS");
  if (bLineIndex) {
    sdpLines.splice(bLineIndex, 1);
  }
  var bwLine = "b=AS:" + bitrate;
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join("\r\n");
  return sdp;
}
function maybeSetVideoSendInitialBitRate(sdp, params) {
  var initialBitrate = params.videoSendInitialBitrate;
  if (!initialBitrate) {
    return sdp;
  }
  var maxBitrate = initialBitrate;
  var bitrate = params.videoSendBitrate;
  if (bitrate) {
    if (initialBitrate > bitrate) {
      trace("Clamping initial bitrate to max bitrate of " + bitrate + " kbps.");
      initialBitrate = bitrate;
      params.videoSendInitialBitrate = initialBitrate;
    }
    maxBitrate = bitrate;
  }
  var sdpLines = sdp.split("\r\n");
  var mLineIndex = findLine(sdpLines, "m=", "video");
  if (mLineIndex === null) {
    trace("Failed to find video m-line");
    return sdp;
  }
  var codec = params.videoRecvCodec;
  sdp = setCodecParam(sdp, codec, "x-google-min-bitrate", params.videoSendInitialBitrate.toString());
  sdp = setCodecParam(sdp, codec, "x-google-max-bitrate", maxBitrate.toString());
  return sdp;
}
function removePayloadTypeFromMline(mLine, payloadType) {
  mLine = mLine.split(" ");
  for (var i = 0;i < mLine.length;++i) {
    if (mLine[i] === payloadType.toString()) {
      mLine.splice(i, 1);
    }
  }
  return mLine.join(" ");
}
function removeCodecByName(sdpLines, codec) {
  var index = findLine(sdpLines, "a=rtpmap", codec);
  if (index === null) {
    return sdpLines;
  }
  var payloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines.splice(index, 1);
  var mLineIndex = findLine(sdpLines, "m=", "video");
  if (mLineIndex === null) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex], payloadType);
  return sdpLines;
}
function removeCodecByPayloadType(sdpLines, payloadType) {
  var index = findLine(sdpLines, "a=rtpmap", payloadType.toString());
  if (index === null) {
    return sdpLines;
  }
  sdpLines.splice(index, 1);
  var mLineIndex = findLine(sdpLines, "m=", "video");
  if (mLineIndex === null) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex], payloadType);
  return sdpLines;
}
function maybeRemoveVideoFec(sdp, params) {
  if (params.videoFec !== "false") {
    return sdp;
  }
  var sdpLines = sdp.split("\r\n");
  var index = findLine(sdpLines, "a=rtpmap", "red");
  if (index === null) {
    return sdp;
  }
  var redPayloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines = removeCodecByPayloadType(sdpLines, redPayloadType);
  sdpLines = removeCodecByName(sdpLines, "ulpfec");
  index = findLine(sdpLines, "a=fmtp", redPayloadType.toString());
  if (index === null) {
    return sdp;
  }
  var fmtpLine = parseFmtpLine(sdpLines[index]);
  var rtxPayloadType = fmtpLine.pt;
  if (rtxPayloadType === null) {
    return sdp;
  }
  sdpLines.splice(index, 1);
  sdpLines = removeCodecByPayloadType(sdpLines, rtxPayloadType);
  return sdpLines.join("\r\n");
}
function maybePreferAudioSendCodec(sdp, params) {
  return maybePreferCodec(sdp, "audio", "send", params.audioSendCodec);
}
function maybePreferAudioReceiveCodec(sdp, params) {
  return maybePreferCodec(sdp, "audio", "receive", params.audioRecvCodec);
}
function maybePreferVideoSendCodec(sdp, params) {
  return maybePreferCodec(sdp, "video", "send", params.videoSendCodec);
}
function maybePreferVideoReceiveCodec(sdp, params) {
  return maybePreferCodec(sdp, "video", "receive", params.videoRecvCodec);
}
function maybePreferCodec(sdp, type, dir, codec) {
  var str = type + " " + dir + " codec";
  if (!codec) {
    trace("No preference on " + str + ".");
    return sdp;
  }
  trace("Prefer " + str + ": " + codec);
  var sdpLines = sdp.split("\r\n");
  var mLineIndex = findLine(sdpLines, "m=", type);
  if (mLineIndex === null) {
    return sdp;
  }
  var payload = getCodecPayloadType(sdpLines, codec);
  if (payload) {
    sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
  }
  sdp = sdpLines.join("\r\n");
  return sdp;
}
function setCodecParam(sdp, codec, param, value) {
  var sdpLines = sdp.split("\r\n");
  var fmtpLineIndex = findFmtpLine(sdpLines, codec);
  var fmtpObj = {};
  if (fmtpLineIndex === null) {
    var index = findLine(sdpLines, "a=rtpmap", codec);
    if (index === null) {
      return sdp;
    }
    var payload = getCodecPayloadTypeFromLine(sdpLines[index]);
    fmtpObj.pt = payload.toString();
    fmtpObj.params = {};
    fmtpObj.params[param] = value;
    sdpLines.splice(index + 1, 0, writeFmtpLine(fmtpObj));
  } else {
    fmtpObj = parseFmtpLine(sdpLines[fmtpLineIndex]);
    fmtpObj.params[param] = value;
    sdpLines[fmtpLineIndex] = writeFmtpLine(fmtpObj);
  }
  sdp = sdpLines.join("\r\n");
  return sdp;
}
function removeCodecParam(sdp, codec, param) {
  var sdpLines = sdp.split("\r\n");
  var fmtpLineIndex = findFmtpLine(sdpLines, codec);
  if (fmtpLineIndex === null) {
    return sdp;
  }
  var map = parseFmtpLine(sdpLines[fmtpLineIndex]);
  delete map.params[param];
  var newLine = writeFmtpLine(map);
  if (newLine === null) {
    sdpLines.splice(fmtpLineIndex, 1);
  } else {
    sdpLines[fmtpLineIndex] = newLine;
  }
  sdp = sdpLines.join("\r\n");
  return sdp;
}
function parseFmtpLine(fmtpLine) {
  var fmtpObj = {};
  var spacePos = fmtpLine.indexOf(" ");
  var keyValues = fmtpLine.substring(spacePos + 1).split("; ");
  var pattern = new RegExp("a=fmtp:(\\d+)");
  var result = fmtpLine.match(pattern);
  if (result && result.length === 2) {
    fmtpObj.pt = result[1];
  } else {
    return null;
  }
  var params = {};
  for (var i = 0;i < keyValues.length;++i) {
    var pair = keyValues[i].split("=");
    if (pair.length === 2) {
      params[pair[0]] = pair[1];
    }
  }
  fmtpObj.params = params;
  return fmtpObj;
}
function writeFmtpLine(fmtpObj) {
  if (!fmtpObj.hasOwnProperty("pt") || !fmtpObj.hasOwnProperty("params")) {
    return null;
  }
  var pt = fmtpObj.pt;
  var params = fmtpObj.params;
  var keyValues = [];
  var i = 0;
  for (var key in params) {
    keyValues[i] = key + "=" + params[key];
    ++i;
  }
  if (i === 0) {
    return null;
  }
  return "a=fmtp:" + pt.toString() + " " + keyValues.join("; ");
}
function findFmtpLine(sdpLines, codec) {
  var payload = getCodecPayloadType(sdpLines, codec);
  return payload ? findLine(sdpLines, "a=fmtp:" + payload.toString()) : null;
}
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (var i = startLine;i < realEndLine;++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr || sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}
function getCodecPayloadType(sdpLines, codec) {
  var index = findLine(sdpLines, "a=rtpmap", codec);
  return index ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
}
function getCodecPayloadTypeFromLine(sdpLine) {
  var pattern = new RegExp("a=rtpmap:(\\d+) [a-zA-Z0-9-]+\\/\\d+");
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(" ");
  var newLine = elements.slice(0, 3);
  newLine.push(payload);
  for (var i = 3;i < elements.length;i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(" ");
}
;var SignalingChannel = function(wssUrl, wssPostUrl) {
  this.wssUrl_ = wssUrl;
  this.wssPostUrl_ = wssPostUrl;
  this.roomId_ = null;
  this.clientId_ = null;
  this.websocket_ = null;
  this.registered_ = false;
  this.onerror = null;
  this.onmessage = null;
};
SignalingChannel.prototype.open = function() {
  if (this.websocket_) {
    trace("ERROR: SignalingChannel has already opened.");
    return;
  }
  trace("Opening signaling channel.");
  return new Promise(function(resolve, reject) {
    if (isChromeApp()) {
      this.websocket_ = new RemoteWebSocket(this.wssUrl_, this.wssPostUrl_);
    } else {
      this.websocket_ = new WebSocket(this.wssUrl_);
    }
    this.websocket_.onopen = function() {
      trace("Signaling channel opened.");
      this.websocket_.onerror = function() {
        trace("Signaling channel error.");
      };
      this.websocket_.onclose = function(event) {
        trace("Channel closed with code:" + event.code + " reason:" + event.reason);
        this.websocket_ = null;
        this.registered_ = false;
      };
      if (this.clientId_ && this.roomId_) {
        this.register(this.roomId_, this.clientId_);
      }
      resolve();
    }.bind(this);
    this.websocket_.onmessage = function(event) {
      trace("WSS->C: " + event.data);
      var message = parseJSON(event.data);
      if (!message) {
        trace("Failed to parse WSS message: " + event.data);
        return;
      }
      if (message.error) {
        trace("Signaling server error message: " + message.error);
        return;
      }
      this.onmessage(message.msg);
    }.bind(this);
    this.websocket_.onerror = function() {
      reject(Error("WebSocket error."));
    };
  }.bind(this));
};
SignalingChannel.prototype.register = function(roomId, clientId) {
  if (this.registered_) {
    trace("ERROR: SignalingChannel has already registered.");
    return;
  }
  this.roomId_ = roomId;
  this.clientId_ = clientId;
  if (!this.roomId_) {
    trace("ERROR: missing roomId.");
  }
  if (!this.clientId_) {
    trace("ERROR: missing clientId.");
  }
  if (!this.websocket_ || this.websocket_.readyState !== WebSocket.OPEN) {
    trace("WebSocket not open yet; saving the IDs to register later.");
    return;
  }
  trace("Registering signaling channel.");
  var registerMessage = {cmd:"register", roomid:this.roomId_, clientid:this.clientId_};
  this.websocket_.send(JSON.stringify(registerMessage));
  this.registered_ = true;
  trace("Signaling channel registered.");
};
SignalingChannel.prototype.close = function(async) {
  if (this.websocket_) {
    this.websocket_.close();
    this.websocket_ = null;
  }
  if (!this.clientId_ || !this.roomId_) {
    return;
  }
  var path = this.getWssPostUrl();
  return sendUrlRequest("DELETE", path, async)["catch"](function(error) {
    trace("Error deleting web socket connection: " + error.message);
  }.bind(this)).then(function() {
    this.clientId_ = null;
    this.roomId_ = null;
    this.registered_ = false;
  }.bind(this));
};
SignalingChannel.prototype.send = function(message) {
  if (!this.roomId_ || !this.clientId_) {
    trace("ERROR: SignalingChannel has not registered.");
    return;
  }
  trace("C->WSS: " + message);
  var wssMessage = {cmd:"send", msg:message};
  var msgString = JSON.stringify(wssMessage);
  if (this.websocket_ && this.websocket_.readyState === WebSocket.OPEN) {
    this.websocket_.send(msgString);
  } else {
    var path = this.getWssPostUrl();
    var xhr = new XMLHttpRequest;
    xhr.open("POST", path, true);
    xhr.send(wssMessage.msg);
  }
};
SignalingChannel.prototype.getWssPostUrl = function() {
  return this.wssPostUrl_ + "/" + this.roomId_ + "/" + this.clientId_;
};
function extractStatAsInt(stats, statObj, statName) {
  var str = extractStat(stats, statObj, statName);
  if (str) {
    var val = parseInt(str);
    if (val !== -1) {
      return val;
    }
  }
  return null;
}
function extractStat(stats, statObj, statName) {
  var report = getStatsReport(stats, statObj, statName);
  if (report && report[statName] !== -1) {
    return report[statName];
  }
  return null;
}
function getStatsReport(stats, statObj, statName, statVal) {
  if (stats) {
    for (var stat in stats) {
      var report = stats[stat];
      if (report.type === statObj) {
        var found = true;
        if (statName) {
          var val = statName === "id" ? report.id : report[statName];
          found = statVal !== undefined ? val === statVal : val;
        }
        if (found) {
          return report;
        }
      }
    }
  }
}
function computeRate(newReport, oldReport, statName) {
  var newVal = newReport[statName];
  var oldVal = oldReport ? oldReport[statName] : null;
  if (newVal === null || oldVal === null) {
    return null;
  }
  return (newVal - oldVal) / (newReport.timestamp - oldReport.timestamp) * 1E3;
}
function computeBitrate(newReport, oldReport, statName) {
  return computeRate(newReport, oldReport, statName) * 8;
}
function computeE2EDelay(captureStart, remoteVideoCurrentTime) {
  if (!captureStart) {
    return null;
  }
  var nowNTP = Date.now() + 22089888E5;
  return nowNTP - captureStart - remoteVideoCurrentTime * 1E3;
}
;var Storage = function() {
};
Storage.prototype.getStorage = function(key, callback) {
  if (isChromeApp()) {
    chrome.storage.local.get(key, function(values) {
      if (callback) {
        window.setTimeout(function() {
          callback(values[key]);
        }, 0);
      }
    });
  } else {
    var value = localStorage.getItem(key);
    if (callback) {
      window.setTimeout(function() {
        callback(value);
      }, 0);
    }
  }
};
Storage.prototype.setStorage = function(key, value, callback) {
  if (isChromeApp()) {
    var data = {};
    data[key] = value;
    chrome.storage.local.set(data, callback);
  } else {
    localStorage.setItem(key, value);
    if (callback) {
      window.setTimeout(callback, 0);
    }
  }
};
function $(selector) {
  return document.querySelector(selector);
}
function queryStringToDictionary(queryString) {
  var pairs = queryString.slice(1).split("&");
  var result = {};
  pairs.forEach(function(pair) {
    if (pair) {
      pair = pair.split("=");
      if (pair[0]) {
        result[pair[0]] = decodeURIComponent(pair[1] || "");
      }
    }
  });
  return result;
}
function sendAsyncUrlRequest(method, url, body) {
  return sendUrlRequest(method, url, true, body);
}
function sendUrlRequest(method, url, async, body) {
  return new Promise(function(resolve, reject) {
    var xhr;
    var reportResults = function() {
      if (xhr.status !== 200) {
        reject(Error("Status=" + xhr.status + ", response=" + xhr.responseText));
        return;
      }
      resolve(xhr.responseText);
    };
    xhr = new XMLHttpRequest;
    if (async) {
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) {
          return;
        }
        reportResults();
      };
    }
    xhr.open(method, url, async);
    xhr.send(body);
    if (!async) {
      reportResults();
    }
  });
}
function requestIceServers(iceServerRequestUrl, iceTransports) {
  return new Promise(function(resolve, reject) {
    sendAsyncUrlRequest("POST", iceServerRequestUrl).then(function(response) {
      var iceServerRequestResponse = parseJSON(response);
      if (!iceServerRequestResponse) {
        reject(Error("Error parsing response JSON: " + response));
        return;
      }
      if (iceTransports !== "") {
        filterIceServersUrls(iceServerRequestResponse, iceTransports);
      }
      trace("Retrieved ICE server information.");
      resolve(iceServerRequestResponse.iceServers);
    })["catch"](function(error) {
      reject(Error("ICE server request error: " + error.message));
      return;
    });
  });
}
function parseJSON(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    trace("Error parsing json: " + json);
  }
  return null;
}
function filterIceServersUrls(config, protocol) {
  var transport = "transport=" + protocol;
  var newIceServers = [];
  for (var i = 0;i < config.iceServers.length;++i) {
    var iceServer = config.iceServers[i];
    var newUrls = [];
    for (var j = 0;j < iceServer.urls.length;++j) {
      var url = iceServer.urls[j];
      if (url.indexOf(transport) !== -1) {
        newUrls.push(url);
      } else {
        if (url.indexOf("?transport=") === -1) {
          newUrls.push(url + "?" + transport);
        }
      }
    }
    if (newUrls.length !== 0) {
      iceServer.urls = newUrls;
      newIceServers.push(iceServer);
    }
  }
  config.iceServers = newIceServers;
}
function setUpFullScreen() {
  if (isChromeApp()) {
    document.cancelFullScreen = function() {
      chrome.app.window.current().restore();
    };
  } else {
    document.cancelFullScreen = document.webkitCancelFullScreen || document.mozCancelFullScreen || document.cancelFullScreen;
  }
  if (isChromeApp()) {
    document.body.requestFullScreen = function() {
      chrome.app.window.current().fullscreen();
    };
  } else {
    document.body.requestFullScreen = document.body.webkitRequestFullScreen || document.body.mozRequestFullScreen || document.body.requestFullScreen;
  }
  document.onfullscreenchange = document.onfullscreenchange || document.onwebkitfullscreenchange || document.onmozfullscreenchange;
}
function isFullScreen() {
  if (isChromeApp()) {
    return chrome.app.window.current().isFullscreen();
  }
  return !!(document.webkitIsFullScreen || document.mozFullScreen || document.isFullScreen);
}
function fullScreenElement() {
  return document.webkitFullScreenElement || document.webkitCurrentFullScreenElement || document.mozFullScreenElement || document.fullScreenElement;
}
function randomString(strLength) {
  var result = [];
  strLength = strLength || 5;
  var charSet = "0123456789";
  while (strLength--) {
    result.push(charSet.charAt(Math.floor(Math.random() * charSet.length)));
  }
  return result.join("");
}
function isChromeApp() {
  return typeof chrome !== "undefined" && typeof chrome.storage !== "undefined" && typeof chrome.storage.local !== "undefined";
}
function trace(text) {
  if (text[text.length - 1] === "\n") {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1E3).toFixed(3);
    console.log(now + ": " + text);
  } else {
    console.log(text);
  }
}
;var apprtc = apprtc || {};
apprtc.windowPort = apprtc.windowPort || {};
(function() {
  var port_;
  apprtc.windowPort.sendMessage = function(message) {
    var port = getPort_();
    try {
      port.postMessage(message);
    } catch (ex) {
      trace("Error sending message via port: " + ex);
    }
  };
  apprtc.windowPort.addMessageListener = function(listener) {
    var port = getPort_();
    port.onMessage.addListener(listener);
  };
  var getPort_ = function() {
    if (!port_) {
      port_ = chrome.runtime.connect();
    }
    return port_;
  };
})();

