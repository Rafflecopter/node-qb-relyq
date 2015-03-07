// qb-relyq/lib/queue/index.js
// Provide relyq queue component for qb

// local
var optionDefaults = require('../options')
  , QueueManager = require('../queue_manager')

module.exports = pushComponent

function pushComponent(qb, options) {
  options = optionDefaults(qb, options)
  qb._relyq = qb._relyq || {}
  qb._relyq.options = qb._relyq.options || options

  var qmanager = qb._relyq.qmanager = qb._relyq.qmanager || new QueueManager(qb, options)

  qb
    .on('push', function (location, task, next) {
      if (/^relyq:\/\//.test(location)) {
        var key = location.split('relyq://')[1]

        qmanager.byKey(key, function (qobj) {
          if (!qobj.queue._redis.ready)
            return next(new Error('Redis is not connected. Cannot push tasks.'))

          try {
            if (qobj.options.allow_defer && task[qobj.options.defer_field]) {
              qobj.queue.defer(task, task[qobj.options.defer_field], next)
            } else if (qobj.options.allow_recur && task[qobj.options.recur_field]) {
              qobj.queue.recur(task, task[qobj.options.recur_field], next)
            } else {
              qobj.queue.push(task, next)
            }
          } catch (err) {
            next(err)
          }
        })
      }
    })
    .on('end', qmanager.end.bind(qmanager))
}