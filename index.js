// qb-relyq/index.js
// Provide relyq backend for qb

var relyq = require('relyq')
  , async = require('async')
  , _ = require('underscore')

module.exports = backend

var default_options = {
  prefix: 'qb', //qb-relyq: Base prefix of all redis keys
  clean_finish: true, //relyq: Don't keep jobs after being finished
  delimeter: ':', //all: Redis key delimeter
  idfield: 'id', //relyq/qb: Field containing the id
  Q: 'RedisJsonQ', //qb-relyq: relyq Queue Type
  max_concurrent_callbacks: 100, //relyq-listener: default maximum number of concurrent callbacks per service
  allow_defer: true, //relyq: Allow deferred tasks
  defer_field: 'when', //qb-relyq: Field containing a timestamp signifying a deferred task
  defer_polling_interval: 1000, //relyq: interval between checking for deferred tasks
  allow_recur: true, //relyq: Allow recurring tasks
  recur_field: 'every', //qb-relyq: Field containing a millisecond interval
  recur_polling_interval: 60000, //relyq: Polling interval between recurring task checks
  specific: {}, //qb-relyq: A list of specific relyq options for any type of queue
}

function defaultify(options) {
  options = _.defaults(options || {}, default_options)
  options.Q = (typeof options.Q === 'function') ? options.Q : relyq[options.Q]
  return options
}

function backend(options, qb) {
  options = defaultify(options)
  var queues = {}
    , redis = options.redis
    , Q = options.Q

  if (!redis) {
    throw new Error('qb-relyq requires a redis connection')
  }

  qb
    .on('queue-start', function (type, next) {
      var key = [options.prefix, 'service', type].join(options.delimeter)
        , opts = _.extend(_.clone(options), {prefix: key}, options.specific[type] || {})
        , queue = new Q(redis, opts)
        , listener = queue.listen(opts)

      if (opts.allow_recur) queue.on('recurring-ready', ready)
      if (opts.allow_defer) queue.on('deferred-ready', ready)
      queue.on('error', function (err) {
        qb.emit('error', err)
      })

      listener.on('ready', ready)
        .on('error', function (err, taskref, task) {
          qb.emit('error', err)
        })
        .on('task', function (task, done) {
          qb.emit('process', type, task, done)
        })

      queues[type] = {queue: queue, listener: listener, options: opts}

      var readycnt = 1 + (opts.allow_recur ? 1 : 0) + (opts.allow_defer ? 1 : 0);
      function ready(err) {
        if (err) { readycnt = -1; return next(err); }
        readycnt --;
        if (!readycnt) { qb.emit('queue-ready', type); next(); }
      }
    })
    .on('push')
    .use(function (type, task, next) {
      next(redis.ready ? null : new Error('Redis is not connected. Cannot push tasks.'))
    })
    .use(function (type, task, next) {
      try {
        var q = queues[type]
        if (q.options.allow_defer && task[q.options.defer_field]) {
          q.queue.defer(task, task[q.options.defer_field], next)
        } else if (q.options.allow_recur && task[q.options.recur_field]) {
          q.queue.recur(task, task[q.options.recur_field], next)
        } else {
          q.queue.push(task, next)
        }
      } catch (err) {
        next(err)
      }
    })

    .on('queues-end', function (next) {
      async.each(_.values(queues), function (queue, cb) {
        queue.queue.end(cb)
      }, function (err) {
        redis.end()
        next(err)
      })
    })


  /*
  * Get a types's underlying queue for inspection and modification.
  * Must be called after .start()
  *
  * @param type
  */
  qb.queue = function queue(type) {
    return queues[type].queue;
  }

  qb.undefer_remove = function undefer_remove(type, id, callback) {
    if (!redis.connected) {
      return callback(new Error('Redis is not connected. Cannot undefer right now.'))
    }
    queues[type].undefer_remove(id, callback)
    return qb
  }

  qb.undefer_push = function undefer_push(type, id, callback) {
    if (!redis.connected) {
      return callback(new Error('Redis is not connected. Cannot undefer right now.'))
    }
    queues[type].undefer_push(id, callback)
    return qb
  }

}