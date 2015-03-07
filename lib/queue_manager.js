var async = require('async')
  , extend = require('xtend')
  , util = require('./util')
  , objectValues = require('object-values')

module.exports = QueueManager

function QueueManager(qb, options) {
  this.qb = qb
  this.options = options
  qb._relyq = qb._relyq || {}
  this.queues = qb._relyq.queues = qb._relyq.queues || {}
}

QueueManager.prototype.end = function (callback) {
  if (this._ended) return callback()

  async.each(objectValues(this.queues), function (qobj, cb) {
    qobj.queue.end(cb)
  }, callback)
  this._ended = true
}

QueueManager.prototype.byType = function (type, callback) {
  return this.byKey(this.key(type), callback, type)
}

QueueManager.prototype.byKey = function (key, callback, optional_type) {
  var qobj = this.queues[key]

  if (!qobj)
    this.queues[key] = createQueue(this.qb, key, optional_type, this.specificOptions(key, optional_type), callback)
  else
    callback(qobj)
}

QueueManager.prototype.specificOptions = function (key, type) {
  var options = this.options
    , opts = extend({}, options, {prefix: key})
  if (options.specific[key])
    opts = extend(opts, options.specific[key])
  if (type && options.specific[type])
    opts = extend(opts, options.specific[type])
  return opts
}

QueueManager.prototype.key = function (type) {
  return [this.options.prefix, 'service', type].join(this.options.delimeter)
}

function createQueue(qb, key, type, options, callback) {
  var queue = new options.Q(options)
    , qobj = {type: type, queue: queue, options: options}

  // Listen for events
  queue.on('error', function (err) {
    qb.emit('error', err)
  })

  // Wait for all things to be ready
  async.parallel([
    options.allow_recur ? util.async_event(queue, 'recurring-ready') : util.async_noop
  , options.allow_defer ? util.async_event(queue, 'deferred-ready') : util.async_noop
  , !queue._redis.ready ? util.async_event(queue._redis, 'ready') : util.async_noop
  ], function () {
    callback(qobj)
  })

  return qobj
}
