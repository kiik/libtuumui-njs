
var util = require('util');


var ComponentStore = function() {
  this.init();
}

ComponentStore.prototype = {
  init: function() {
    this._ctx = {};
  },
  has: function(key) {
    return this._ctx.hasOwnProperty(key);
  },
  set: function(key, value) {
    if(this._ctx.hasOwnProperty(key)) throw new Error(util.format('Component "%s" already exists!', key));
    this._ctx[key] = value;
  },
  get: function(key) {
    if(!this._ctx.hasOwnProperty(key)) return null;
    return this._ctx[key];
  }
}


var Injector = function() {
  this.init();
}

Injector.prototype = {
  init: function() {
    this.moduleStore = new ComponentStore();  // Module factories  (multiple instances per factory)

    this.serviceStore = new ComponentStore(); // Service factories (1 instance per factory)
    this.store = new ComponentStore();        // Service instance store
  },

  has: function() {
    if(this.store.has.apply(this.store, arguments)) return true;
    if(this.moduleStore.has.apply(this.moduleStore, arguments)) return true;
    if(this.serviceStore.has.apply(this.serviceStore, arguments)) return true;
    return false;
  },

  resolve: function(deps) {
    var out = [];
    for(var ix in deps) {
      var name = deps[ix];
      var obj = null;

      // Check for module
      if(this.moduleStore.has(name)) {
        obj = this.moduleStore.get(name)();
      } else {
	// Check for service
	obj = this.getOrCreate(name);
      }

      if(obj != null)
        out.push(obj);
      else
	throw new Error(util.format('Unresolved dependency "%s"!', name));
    }
    return out;
  },
  service: function(name, deps, fab) {
    if(this.serviceStore.has(name)) throw new Error(util.format('Service "%s" already defined!', name));

    var $injector = this;
    this.serviceStore.set(name, function() {
      return fab.apply(null, $injector.resolve(deps));
    });
  },
  factory: function(name, deps, fab) {
    if(this.moduleStore.has(name)) throw new Error(util.format('Factory "%s" already defined!', name));

    var $injector = this;
    this.moduleStore.set(name, function() {
      return fab.apply(null, $injector.resolve(deps));
    });   
  },

  getOrCreate: function(name) {
    if(!this.store.has(name))
      this.store.set(name, this.create(name));
    return this.store.get(name);
  },
  create: function(name) {
    if(!this.serviceStore.has(name)) throw new Error(util.format('Component "%s" definition not found!', name));
    return this.serviceStore.get(name)();
  },
}

module.exports = new Injector();
