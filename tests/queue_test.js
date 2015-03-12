// qb_test.js

var Moniker = require('moniker')
  , redis = require('redis')

var QB = require('qb')
  , qbRelyq = require('..')
  , createRedis = function() { return redis.createClient(6379, 'localhost', { enable_offline_queue: false }) };


var qb;

// If we are getting a test.done complaint, turn this on. It helps find errors
process.on('uncaughtException', function (err) {
  console.error(err.stack);
});
process.setMaxListeners(100);

var tests = exports.tests = {};

tests.setUp = function (cb) {
  qb = new QB()
    .component(qbRelyq.queue, {
      allow_defer: true,
      allow_recur: true,
      createRedis: createRedis,
      prefix: 'qb:'+Moniker.choose(),
      defer_polling_interval: 50,
      recur_polling_interval: 50,
      blocking_timeout: 1
    })
  cb();
}

tests.tearDown = function (cb) {
  qb && qb.end();
  cb();
}

tests.null_usage = function (test) {
  test.expect(0)
  qb.on('error', test.ifError)
  test.done()
}

tests.process_ready = function (test) {
  var readys = {}
    , readyc = 0
  test.expect(2)
  qb
    .on('error', test.ifError)
    .can('something', function () {})
    .can('else', function () {})
    .on('process-ready', function (type, next) {
      readys[type] = true
      readyc++
      if (readyc == 2) {
        test.ok(readys.something)
        test.ok(readys.else)
        setImmediate(test.done)
      }
      next()
    })
}

tests.basic = function basic (test) {
  test.expect(5)
  var called = false;
  qb.on('error', test.ifError)
    .can('foobar', function (task, done) {
      test.equal(task.foo, 'bar');
      called = true;
      done();
    })
    .post('process')
      .use(function (type, task, next) {
        test.equal(type, 'foobar');
        test.equal(task.foo, 'bar');
        test.equal(called, true);
        next();
      })
    .on('finish', function (type, task, next) {
      setImmediate(test.done);
    })

    .on('process-ready', function (type, next) {
      qb.push('foobar', {foo: 'bar'}, test.ifError)
      next()
    })
}

tests.push_middleware = function push_middleware (test) {
  test.expect(4)
  qb.can('cancan', function (task, done) {
      test.equal(task.prepush, true);
      done();
    })
    .pre('push', function (location, task, next) {
      test.equal(location, 'relyq://' + qb._relyq.options.prefix + ':service:cancan');
      test.equal(task.can, 'can');
      task.prepush = true;
      next();
    })
    .on('finish', function () { setImmediate(test.done); })
    .on('process-ready', function () {
      qb.push('cancan', {can: 'can'}, test.ifError);
    });
}

tests.multiple = function multiple(test) {
  var types = ['super-soaker', 'bad-soaker', 'super-fail']
    , ready = {}
  test.expect(14)
  var n = 0, tend = function () {if (++n > 4) setImmediate(test.done); }

  qb.on('error', test.done)
    .on('process-ready', function (type) {
      ready[type] = true
      console.log('ready', ready)
      if (types.every(function (type) { return ready[type] })) {
        qb
          .push('super-soaker', {something: 'here'}, test.ifError)
          .push('super-soaker', {something: 'else'}, test.ifError)
          .push('bad-soaker', {something: 'here'}, test.ifError)
          .push('super-fail', {something: 'here'}, test.ifError)
          .push('bad-soaker', {something: 'here'}, test.ifError);
      }
    })
    .can('super-soaker', function (task, done) {
      task.soak = true;
      done();
    })
    .can('bad-soaker', function (task, done) {
      task.soak = false;
      done();
    })
    .can('super-fail', function (task, done) {
      // do nothing
      done(new Error('andross'));
    })
    .on('fail', function (type, task, next) {
      test.equal(type, 'super-fail');
      tend();
      next();
    })
    .on('finish', function (type, task, next) {
      test.ok({'super-soaker':1, 'bad-soaker':1}[type])
      test.equal(task.soak, type === 'super-soaker')
      tend();
      next();
    })
}

tests.deferred = function deferred(test) {
  var called = false;

  qb.on('error', test.done)
    .can('after', function (task, done) {
      test.ok(task.received + 50 < Date.now(), 'processing time too early recieved: ' + task.received + ' now: ' + Date.now());
      called = true;
      done();
    })
    .pre('push', QB.middleware.setTimestamp('received'))
    .on('finish', function (type, task, next) {
      test.ok(called);
      setImmediate(test.done);
    })
    .on('process-ready', function () {
      qb.push('after', {foo:'bar', when: Date.now() + 100});
    });
}

tests.recurring = function recurring(test) {
  test.expect(8)
  var called = 0, now = Date.now();

  qb.on('error', test.done)
    .can('joomla', function (task, done) {
      test.ok(now <= task.received && task.received < Date.now(), 'received is not in the right band ' + now + ' < ' + task.received + ' < ' + Date.now())
      test.ok(now + (called++) * 75 < Date.now(), 'processing time too early n: ' + called + ' recieved: ' + task.received + ' now: ' + Date.now())
      done();
    })
    .pre('push', QB.middleware.setTimestamp('received'))
    .on('finish', function (type, task, next) {
      if (called === 3) {
        qb._relyq.qmanager.byType('joomla', function (qobj) {
          qobj.queue.recurring.remove('xxrecur123', task.every, function (err) {
            test.ifError(err)
            setTimeout(test.done, 100)
          })
        })
      }
      next()
    })
    .on('process-ready', function () {
      qb.push('joomla', {foo:'bar', every: 75, id: 'xxrecur123'}, test.ifError);
    });
}

tests.push = function (test) {
  var qbpush = new QB()
    .component(qbRelyq.push, {createRedis: createRedis})
    .alias('foobar', 'relyq://' + qb._relyq.options.prefix + ':service:foobar')

  qb.on('error', test.ifError)
    .can('foobar', function (task, done) {
      test.equal(task.foo, 'bar');
      called = true;
      done();
    })
    .post('process')
      .use(function (type, task, next) {
        test.equal(type, 'foobar');
        test.equal(task.foo, 'bar');
        test.equal(called, true);
        next();
      })
    .on('finish', function (type, task, next) {
      setImmediate(test.done);
    })

    .on('process-ready', function (type, next) {
      qbpush.push('foobar', {foo: 'bar'}, test.ifError)
      next()
    })
    .on('end', function () {
      qbpush.end()
    })
}

tests.undefer_remove = function deferred(test) {
  test.expect(1)
  qb.on('error', test.done)
    .can('after', function (task, done) {
      test.ifError(new Error('task should have been undeferred'))
      done()
    })
    .on('process-ready', function () {
      qb.push('after', {id:'mother-of-god', foo:'bar', when: Date.now() + 100})
      setTimeout(function () {
        qb.undefer_remove('after', 'mother-of-god', function (err) {
          test.ifError(err)
          setTimeout(test.done, 100)
        })
      }, 50)
    });
}

tests.undefer_push = function (test) {
  test.expect(2)
  qb.on('error', test.done)
    .can('after', function (task, done) {
      test.ok(task.received + 100 > Date.now(), 'processing time too late. should have been undeferred');
      setImmediate(test.done)
      done();
    })
    .pre('push', QB.middleware.setTimestamp('received'))
    .on('process-ready', function () {
      qb.push('after', {id:'son-of-sam', foo:'bar', when: Date.now() + 200})
      setTimeout(function () {
        qb.undefer_push('after', 'son-of-sam', function (err) {
          test.ifError(err)
        })
      }, 50)
    });
}


tests.push_to_nowhere = function (test) {
  test.expect(1)
  qb.on('error', test.ifError)
    .push('http://something.else/yoyo', {}, function (err) {
      test.ifError(err)
      test.done()
    })
}