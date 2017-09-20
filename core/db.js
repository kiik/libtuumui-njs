
const pg = require('pg');

const copyTo = require('pg-copy-streams').to;

const config = require('../config');


const db = new pg.Client(config.db);


module.exports = {
  factory: function dbFactory(config) {
    if(!config) config = {};
    if(!config.db) return null;

    return new Promise(function(resolve, reject) {
      db.connect(function(stream) {
        console.log('Connected to database.');

        console.log('Connected, test query...');

        var stream = db.query(copyTo("COPY (SELECT * FROM log.sensorlog WHERE sensor_id = 1200 AND eventdate BETWEEN '2017-8-27 14:26:35+00:00'::timestamptz AND '2017-8-27 14:28:15+00:00'::timestamptz LIMIT 20) TO STDOUT WITH CSV;", [], function(err, res) {
          console.log('cb', err, res);
        }));

        stream.pipe(process.stdout);

        function done()
        {
          console.log();
        }

        stream.on('end', done);
        stream.on('error', done);

        console.log('Waiting response...');

        resolve(db);
      });
    });
  }
};
