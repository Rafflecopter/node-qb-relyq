// qb-relyq/lib/queue/index.js
// Provide relyq queue component for qb

// local
var optionDefaults = require('../options')
  , QueueManager = require('../queue_manager')

module.exports = queueComponent

function queueComponent(qb, options) {
  options = optionDefaults(qb, options)
  qb._relyq = qb._relyq || {}
  qb._relyq.options = qb._relyq.options || options

  var qmanager = qb._relyq.qmanager = qb._relyq.qmanager || new QueueManager(qb, options)

  qb
    // Setup the push component for storing .push tasks into a queue
    .component(require('../push'), options)
    .on('process-type', function (type, next) {
      qb.alias(type, 'relyq://' + qmanager.key(type))
      next()
    })

    .on('process-type', function (type, next) {
      qmanager.byType(type, function (qobj) {
        createListener(qb, qobj, next)
      })
    })

  if (options.allow_defer) {
    // Remove deferred task
    qb.undefer_remove = function undefer_remove(type, id, callback) {
      qmanager.byType(type, function (qobj) {
        if (!qobj.queue._redis.ready) {
          return callback(new Error('Redis is not connected. Cannot undefer right now.'))
        }
        qobj.queue.undefer_remove(id, callback)
      })
      return qb
    }

    // Push a deferred task into todo queue
    qb.undefer_push = function undefer_push(type, id, callback) {
      qmanager.byType(type, function (qobj) {
        if (!qobj.queue._redis.ready) {
          return callback(new Error('Redis is not connected. Cannot undefer right now.'))
        }
        qobj.queue.undefer_push(id, callback)
      })
      return qb
    }
  }
}


function createListener(qb, qobj, callback) {
  var listener = qobj.listener = qobj.queue.listen(qobj.options)

  listener
    .on('error', function (err, taskref, task) {
      qb.emit('error', err)
    })
    .on('task', function (task, done) {
      qb.process(qobj.type, task, done)
    })

  listener.on('ready', callback)

  return qobj
}