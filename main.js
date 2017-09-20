#!/usr/bin/env nodejs
/** @file main.js
 *
 *  @authors Meelik Kiik (kiik.meelik@gmail.com)
 *  @date 23. August 2017
 */

const util = require('util');
const http = require('http');

const factory = require('./core/factory');
const help    = require('./core/helpers');
const config  = require('./config');

module.exports = {
  factory: factory,
  help: help,
  config: config,

  serve_http: function(app) {
    var server = http.createServer(app);

    return server;
  },
}
