/** @file config.js
 *
 *  @authors Meelik Kiik
 *  @date 23. August 2017
 */

var fs = require('fs');
var path = require('path');

var extend = require('util')._extend;

const INSTANCE_CONFIG_PATH = '../instance/config.json';


function attemptDeployConfLoad(config)
{
  var deploy_conf = null;

  try {
    deploy_conf = require(INSTANCE_CONFIG_PATH);
  } catch(e) {
    if (e.code != 'MODULE_NOT_FOUND') throw e;
  }

  if(deploy_conf != null) config = extend(config, deploy_conf);
}


module.exports = {
  setupAssets: function setupAssets(config, params) {
    if(!params.assets) return config;

    config.assets = {
      urlPrefix: '/assets',
      basePath: params.assetBasePath,
      assetDir: params.assetDir,
      caches: {
        js: 'js/app.min.js'
      },
      js: params.assets,
      jsMin: [
        'js/app.min.js',
      ],

      _compiled: false,

      getScripts: function() {
        var out = [];
        config.assets.js.forEach(function(elm) {
          out.push(path.join(config.assets.basePath, elm));
        });
        return out;
      },
      getMinifiedScripts: function() {
        var out = [];
        config.assets.jsMin.forEach(function(elm) {
          out.push(path.join(config.assets.basePath, elm));
        });
        return out;
      },
      get: function() {
        const that = config.assets;
        return {
          js: that._compiled ? that.getMinifiedScripts() : that.getScripts()
        }
      },
      compile: function() {
        if(config.assets._compiled) return;

        help.assetCacheGen(config.assets)
          .then(function(err, data) {
            config.assets._compiled = true;
            console.log('Asset cache ready.');
          }, function(err) {
            console.log(err);
          });
      }
    }

    return config;
  },

  setupMQ: function setupMQ(config) {
    config.kafka = {
      host: 'localhost:2181'
    }

    config.consumer = {
      host: 'localhost:2181',
      kafkaHost: 'localhost:9092',
      groupId: null,
      sessionTimeout: 15000,
      protocol: ['roundrobin'],
      fromOffset: 'latest'
    };

    config.mq = {
      Topic: {
        TestTopic: 'App.Test.Topic'
      },
      Group: {
        TestGroup: 'App.Test.Group'
      },
    };
  },

  loadDefaultConfig: function(params) {
    var config = {};

    // Main DB
    if(params.db)
      config.db = {
        host: 'localhost',
        port: 5432,
        database: 'dev_db',
        user: 'dev_user',
        password: 'dev_password',
        application_name: 'app-dev',
        poolSize: 4
      };

    // RethinkDB
    if(params.store)
      config.store = {
        host: 'localhost',
        port: 28015,
        db: 'test'
      };

    if(params.wss)
      config.wss = {
        port: 9080
      };

    if(params.mq)
      module.exports.setupMQ(config);

    return config;
  },

  setupConfig: function(config, params) {

    attemptDeployConfLoad(config);

    return config;
  },

  load: function(params) {
    if(!params) params = {};
    return module.exports.setupConfig(module.exports.loadDefaultConfig(params), params);
  },
};
