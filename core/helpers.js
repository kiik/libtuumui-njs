
const fs   = require('fs');
const path = require('path');
const util = require('util');

const moment = require('moment');
const compressor = require('node-minify');

const sqlFormat = require('pg-format');

var stream = require('stream');



// node v0.10+ use native Transform, else polyfill
var Transform = stream.Transform ||
  require('readable-stream').Transform;

function WSContextPass(mId, options) {
  // allow use without new
  if (!(this instanceof WSContextPass)) {
    return new WSContextPass(mId, options);
  }

  this._msg_id = mId;

  // init Transform
  Transform.call(this, options);
}

util.inherits(WSContextPass, Transform);

WSContextPass.prototype._transform = function (chunk, enc, cb) {
  var values = chunk.toString().trim().split(',');

  var payload = {
    _: this._msg_id,
    v: [parseFloat(values[0]), moment.utc(values[1]).unix()]
  }

  var buf = new Buffer(util.format('%s\n', JSON.stringify(payload)));
  this.push(buf);

  cb();
};



module.exports = {
  'load_routes': function(target, dirname) {
    fs.readdirSync(dirname).forEach(function(file) {
      try {
        var mod = require(path.join(dirname, file));
        if(mod.hasOwnProperty('register_router')) {
          console.log('Registering \'' + file + '\'...');
          mod.register_router(target);
        }
      } catch(e) {

      }
    });
  },
  'load_assets': function(target, dirname) {
    var dir = path.join(dirname, 'assets/lib');
    var assets = [];

    fs.readdirSync(dir).forEach(function(file) {
      var assetlib = path.join(dir, file);
      var assetmod = path.join(assetlib, 'asset.json');
      if(fs.existsSync(assetmod)) {
        var data = {
          css: [],
          js: [],
        };

        data = util._extend(data, JSON.parse(fs.readFileSync(assetmod, 'utf8')));
        assets.push(data);
      }
    });

    console.log('#TODO: Load assets...');
    console.log(assets);
    return assets;
  },

  WSContextPass: WSContextPass,

  assetCacheGen: function(config) {
    console.log('Regenerating asset cache...');

    var output = path.join('./cache', config.caches.js);
    var input = [];
    config.js.forEach(function(elm) {input.push(path.join(config.basePath, elm));});

    var promise = compressor.minify({
      compressor: 'gcc',
      input: input,
      output: output
    });

    return promise;

    return new Promise(function(resolve, reject) {
      resolve(null);
    });
  },

  sqlDateFormat: function(input) {
    return moment.utc(input).format("Y-M-D H:m:sZ");
  },

  sqlFormat: sqlFormat

}
