# qb-relyq

[relyq](https://github.com/Rafflecopter/node-relyq) queue and push components for [qb](https://github.com/Rafflecopter/node-qb). It uses a simple and reliable work queue implemented with redis using [simpleq](https://github.com/Rafflecopter/node-simpleq).

#### Only works with qb v2.0+

## Usage

```
npm install qb qb-relyq --save
```

```javascript
var QB = require('qb')
  , qb = new QB(qbOptions)

// To use relyq as a work queue:
qb.component(require('qb-relyq').queue, relyqOptions)
// OR to just push onto other service's relyqs:
qb.component(require('qb-relyq').push, relyqOptions)
```

## Configuration

The `relyqOptions` above take the following options:

#### Push and Queue Component options

- `createRedis` A `function () { return redisClient }` that is REQUIRED.
- `prefix` The relyq redis keys will be prefixed by this (default: `'qb'`)
- `delimeter` The delimeter to connect the prefix, the string `'service'` and the service type (default: `':'`)
- `Q` The relyq Queue Type. See [relyq docs](https://github.com/Rafflecopter/node-relyq) for details. (default: `'RedisJsonQ'`)
- `allow_defer` Allow deferred tasks (default: `false`)
- `defer_field` Field where the timestamp signifying a deferred task (default: `'when'`)
- `allow_recur` Allow recurring tasks (default: `false`)
- `recur_field` Field where the millisecond recurring interval is signifying a recurring task (default: `'every'`)

#### Queue Component options

- `specific` An optional object of service type to options. When instantiating a queue with `qb-relyq`, specific options for each queue can be detailed in here. For example: `specific: { myservice: { prefix: 'myservice' } }`, which will be used when `qb.can('myservice', myserviceCallback)`
- `clean_finish` Don't keep jobs around in the `finished` sub-queue. (default: `true`)
- `max_concurrent_callbacks` Limit on concurrent callbacks from this queue (default: `100`)
- `blocking_timeout` Seconds of long-polling redis when waiting for new tasks. This will affect how long shutdown takes. (default: `5`)
- `defer_polling_interval` Millisecond interval between deferred task checking (default: `1000`)
- `recur_polling_interval` Millisecond interval between recurring task checking (default: `60000`)
## Notes

- Recurring tasks must include an ID so that they are not duplicated. The ID field defaults is 'id'.

## License

MIT in LICENSE file
