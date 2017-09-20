/** @file index.js
 *  @brief GRMQ Core modules package index.
 *
 *  @authors Meelik Kiik (kiik.meelik@gmail.com)
 *  @date 23. August 2017
 **/

var SysLogger = require('ain2');

var logger = new SysLogger({tag: 'grmq'}); 

module.exports = {
  NewLogger: function(namespace) {
    return new SysLogger({tag: namespace});
  },

  defaultErrorHandler: function(logger) {
    return function(error) {
      logger.error(error);
    }
  },
  defaultErrorStackHandler: function(logger) {
    return function(error) {
      logger.error(error);
      logger.error(error.stack);
    }
  },

  logger: logger
}
