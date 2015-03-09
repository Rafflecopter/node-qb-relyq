var defaults = require('defaults')
  , relyq = require('relyq')

module.exports = defaultify

var default_options = {
  // Needed for both push and queue
  createRedis: null // REQUIRED: function () { return redisClient }
, prefix: 'qb' //qb-relyq: Base prefix of all redis keys
, delimeter: ':' //all: Redis key delimeter
, idfield: 'id' //relyq/qb: Field containing the id
, Q: 'RedisJsonQ' //qb-relyq: relyq Queue Type
, specific: {} //qb-relyq: A list of specific relyq options for any type of queue
, allow_defer: false // Allow deferring tasks
, defer_field: 'when' // Field containing timestamp signifying deferred task
, allow_recur: false // Allow recurring tasks
, recur_field: 'every' // Field containing millisecond recurring interval

  // Just needed for queue
, clean_finish: true //relyq: Don't keep jobs after being finished
, max_concurrent_callbacks: 100 //relyq-listener: default maximum number of concurrent callbacks per service
, blocking_timeout: 5 //simpleq: timeout (seconds) between blocking calls. Allows for redis errors to propogate.
, defer_polling_interval: 1000 //relyq: interval between checking for deferred tasks
, recur_polling_interval: 60000 //relyq: Polling interval between recurring task checks
}

function defaultify(qb, options) {
  options = defaults(options || {}, default_options)
  options.Q = (typeof options.Q === 'function') ? options.Q : relyq[options.Q]
  if (!options.createRedis) {
    throw new Error('qb-relyq requires a createRedis option!')
  }
  return options
}