exports.async_noop = function (cb) { cb() }
exports.async_event = function (emitter, event) {
  return function (callback) {
    emitter.on(event, callback)
  }
}