
const extend = require('util')._extend;

const express = require('express');
const url     = require('url');
const path    = require('path');
const compressor = require('node-minify');

const Kafka = require('kafka-node');

const WebSocket = require('websocket-stream');
const ViewEngine = require('express-dot-engine');

const WSS = require('./wss').WebSocketServer;

function producer_factory(config)
{
  var client = new Kafka.Client(config.kafka.host);

  var producer = new Kafka.Producer(client);

  return producer;
}

function consumer_factory(options, topic, config)
{
  var opts = extend(config.consumer, options);

  var consumer = new Kafka.ConsumerGroup(opts, topic);

  return consumer;
}


module.exports = {
  app_factory: function(config) {
    var app = express();

    return app;
  },
  wss_factory: function(params) {
    var wss = new WSS(params);

    return wss;
  },
  producer_factory: producer_factory,
  consumer_factory: consumer_factory,
}
