
const path = require('path');
const url = require('url');

const websocket = require('websocket-stream');

const help = require('./helpers');
const mdl = require('../models');

const sqlDateFormat = help.sqlDateFormat;
const WSContextPass = help.WSContextPass;

const Transform = require('stream').Transform;


var GR = (function(nsp) {

  nsp.WSServer = function(opts) {
    this.wss = null;

    this.init(opts);
  }

  nsp.WSServer.prototype = {
    init: function(opts) {
      this._uriMap = {};
      this._ctx = {};
      this._strms = {};
      this._seq = 0;
      this._evh = {};

      var that = this;

      this.wss = websocket.createServer(opts, function(stream, req) {that.onStream(stream, req);});

      this.wss.on('connection', function(ws, req) {
        const location = url.parse(req.url, true);
        // You might use location.query.access_token to authenticate or share sessions
        // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)

        ws._socket.setKeepAlive(true);
        ws.on('message', function(msg) {that.onMessage(ws, msg);});
        ws.on('error', function() {
          that.emit('end', ws);
        });
        ws.on('close', function() {
          that.emit('end', ws);
        });
      });

      /*
      function heartbeat() {
        that.isAlive = true;
      }

      this.wss.on('connection', function(ws) {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
            });

            const interval = setInterval(function() {
        that.wss.clients.forEach(function(ws) {
          if (ws.isAlive === false) return ws.terminate();

          ws.isAlive = false;
          ws.ping('', false, true);
        });
      }, 30000);*/
    },

    on: function(ev, cv) { this._evh[ev] = cv; },
    emit: function(ev, data) { if(this._evh.hasOwnProperty(ev)) this._evh[ev](data); },

    onOpen: function() {

    },
    onClose: function() {

    },
    onMessage: function(ws, msg) {
      //TODO: Handle errors
      this._recv(ws, JSON.parse(msg));
    },

    onStream: function(stream, req) {
      console.log('New client stream', stream.socket._ultron.id);
      this._strms[stream.socket._ultron.id] = stream;
    },
    getClientStream: function(ws) {
      console.log('GET stream', ws._ultron.id);
      const stream = this._strms[ws._ultron.id];

      /*
      var out = new Transform();

      out._transform = function(chunk) {
	console.log('toClient', chunk.toString());
        this.push(chunk);
      }

      out.pipe(stream);*/

      return stream;
    },

    _send: function(data) {
      var payload = {};
      for(var key in data) if(data.hasOwnProperty(key)) payload[key] = data[key];
      payload._ = this._seq++;

      //TODO

      return new Promise(function(resolve, reject) {
        //TODO
      });
    },
    _recv: function(ws, msg) {
      var that = this;
      var uri = null;

      if(msg.hasOwnProperty('uri')) {
        uri = msg.uri;

        if(this._uriMap.hasOwnProperty(uri)) {
          handler = this._uriMap[uri];
          handler.apply(this, [ws, msg]);
        }
      }
    },

    send: function(data) {
      return this._send(data);
    },

    uri: function(uri, handler) {
      if(this._uriMap.hasOwnProperty(uri)) throw new Error('URI already in use!');
      this._uriMap[uri] = handler;
    }
  };

  return nsp;
})(GR || {});

module.exports = {
  WebSocketServer: GR.WSServer
}
