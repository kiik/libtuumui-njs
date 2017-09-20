#!/usr/bin/env nodejs

const util = require('util');
const moment = require('moment');

const r = require('rethinkdb');


var logger = {
  log: console.log
}

const SQL_TBL_CALC_SESSIONS = 'calc_sessions';

const DB_NAME = 'test';
const DB_TABLES = [SQL_TBL_CALC_SESSIONS, '_placeholder'];

function init()
{
  return new Promise(function(resolve, reject) {
    r.connect({
      host: 'localhost',
      port: 28015,
      db: 'test'
    }, function(err, conn) {
      if(err) throw err;
      gConn = conn;

      setup().then(resolve, reject);
    });
  });
}

function dbConn()
{
  return r.connect();
}

function dbInit(dbn, conn)
{
  return new Promise(function(resolve, reject) {
    logger.log({fn: 'dbInit', msg: util.format('Creating database "%s"...', dbn)});

    r.dbCreate(dbn).run(conn, function(err, res) {
      if(err) return reject(err);
      resolve(res);
    });
  });
}

function dbSchemaInit(dbn, conn)
{
  return new Promise(function(resolve, reject) {
    logger.log({fn: 'dbSchemaInit', msg: util.format('Creating schema layout in "%s"...', dbn)});

    var tables = DB_TABLES;
    var db = r.db(dbn), queries = [];

    //TODO: Find bulk query method in rethinkdb
    tables.forEach(function(elm) {
      queries.push(new Promise(function(resolve, reject) {
        db.tableCreate(elm).run(conn, function(err, res) {
                if(err) return reject(err);
                resolve(res);
        });
      }));
    });

    Promise.all(queries).then(resolve, reject);
  });
}

function dbSchemaAssert(dbn, conn)
{
  return new Promise(function(resolve, reject) {
    logger.log({fn: 'dbSchemaAssert', msg: util.format('Validating schema in "%s"...', dbn)});

    r.db(dbn).tableList().run(conn, function(err, res) {
      if(err) reject(err);

      var tables = JSON.parse(JSON.stringify(DB_TABLES)); //FIXME
      var missing = [];

      for(var ix in tables) {
        var t = tables[ix];
        var ex = false;

        for(var _ix in res) {
          if(t == res[_ix]) {
            ex = true;
            break;
          }
        }

        if(!ex) missing.push(t);
      }

      if(missing.length > 0) return reject(new Error(util.format("Missing table - '%s'", missing.join(', '))));

      resolve(tables);
    });
  });
}

function dbSetup(conn)
{
  return new Promise(function(resolve, reject) {
    r.dbList().run(conn, function(err, res) {
      if(err) throw err;

      const dbn = DB_NAME;

      // Check if database exists
      for(var ix in res)
        if(res[ix] == dbn) return dbSchemaAssert(dbn, conn).then(resolve, reject);

      // Create database
      dbInit(dbn, conn).then(function(res) {
        dbSchemaInit(dbn, conn).then(function(res) {
          dbSchemaAssert(dbn, conn).then(resolve, reject);
        }, reject);
      }, reject);
    });
  });
}

function dbDemoDataCreate(conn)
{
  return new Promise(function(resolve, reject) {
    r.table(SQL_TBL_CALC_SESSIONS).insert([
      {
        sensorId: 1948,
        createdAt: r.ISO8601(moment.utc().format()),
        period: {start: r.ISO8601("2017-09-05T12:00:00Z"), end:r.ISO8601("2017-09-07T13:14:00Z")},
        origin: 'GR.CRON',
        active: false,
        jobIdSeq: 4,
        runSeq: 3,
        jobs: [
          {
            id: 1,
            nsp: 'GR.Stats.Calc.History',
            input: {sensorId: 1948, start: r.ISO8601("2017-09-05T12:00:00Z"), end: r.ISO8601("2017-09-06T00:00:00Z"), agg_type: 'minute'},
            runIndex: 1,
            ctx: {
              active: false,
              sentAt: '2017-09-07T13:15:32Z'
            }
          },
          {
            id: 2,
            input: {sensorId: 1948, start: r.ISO8601("2017-09-06T00:00:00Z"), end: r.ISO8601("2017-09-07T00:00:00Z"), agg_type: 'minute'},
            nsp: 'GR.Stats.Calc.History',
            runIndex: 2,
            ctx: {
              active: false,
              sentAt: null
            }
          },
          {
            id: 3,
            input: {sensorId: 1948, start: r.ISO8601("2017-09-07T00:00:00Z"), end: r.ISO8601("2017-09-07T13:14:00Z"), agg_type: 'minute'},
            nsp: 'GR.Stats.Calc.Latest',
            runIndex: 1,
            ctx: {
              active: false,
              sentAt: '2017-09-07T13:15:34Z'
            }
          }
        ]
      }
    ]).run(conn, function(err, res) {
      if(err) return reject(err);
      resolve(res);
    });
  });
}

function dbDrop()
{
  const dbn = DB_NAME;

  if(dbn == 'test') {
    r.connect().then(function(conn) {
      r.dbDrop('test').run(conn, function(err, res) {
	if(err) console.log(err);
	console.log(res);
      });
    });
  }
}

function setup()
{
  return new Promise(function(resolve, reject) {
    dbSetup(gConn).then(function(res) {
      dbDemoDataCreate(gConn).then(function(res) {
        console.log(JSON.stringify(res, null, 2));
        console.log('Database ready.');
        resolve(r);
      }, function(err) {
        console.log(err);
        reject(err);
      });
    }, function(err) {
      console.log(err);
      dbDrop();
      reject(err);  //FIXME
      process.exit(-1);
    });
  });
}


var stream_init = false;

module.exports = {
  setupTaskMonitorStream: function(feed) {
    if(!stream_init) {
      stream_init = true;

      dbConn().then(function(conn) {
        console.log('setupTaskMonitorStream :: starting stream');
        return r.table(SQL_TBL_CALC_SESSIONS).withFields('id', 'jobIdSeq', 'sensorId', 'createdAt', 'active').changes().run(conn);
      }).then(function(cursor) {
        cursor.each(function(err, item) {
          if(err) throw err;
          feed.emit('data', item);
        });
      });
    }
  },
  getTaskMonitorData: function() {
    return new Promise(function(resolve, reject) {
      dbConn().then(function(conn) {
        return r.table(SQL_TBL_CALC_SESSIONS).withFields('id', 'jobIdSeq', 'sensorId', 'createdAt', 'active').run(conn);
      }).then(function(cursor) {
        cursor.toArray(function(err, items) {
          if(err) return reject(err);
          resolve(items);
        });
      });
    });
  },
  purgeStaleTasks: function() {
    dbConn().then(function(conn) {
      return r.table(SQL_TBL_CALC_SESSIONS)
        .filter(r.now().sub(r.row('createdAt')).gt(5 * 60))
        .filter({active:false}).delete().run(conn);
    }).then(function(err, res) {
      console.log('purgeStaleTasks:');
      if(err) return console.log(err);
      console.log(res);
      /*
      cursor.toArray(function(err, items) {
        if(err) return console.log(err);
        console.log(items);
      });*/
    });
  },

  connect: function() {
    return dbConn();
  },
  query: function() {
    return r;
  },
  type: function() {
    return r;
  },

  factory: function storeFactory(config) {
    if(!config) config = {};

    if(config.store)
      return dbInit();
    else
      return null;
  },
}
