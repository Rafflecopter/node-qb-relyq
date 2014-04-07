# qb-relyq

A [relyq](https://github.com/Rafflecopter/node-relyq) backend for [qb](https://github.com/Rafflecopter/node-qb). A single backend must be selected to be used with qb. This is the original backend and uses a simple and reliable work queue implemented with redis using [simpleq](https://github.com/Rafflecopter/node-simpleq).

#### Only works with qb v1.0+

## Usage

```
npm install qb qb-relyq --save
```

```javascript
var QB = require('qb').backend(require('qb-relyq'))
  , qb = new QB(options)
```

## Configuration

The `new QB` or `require('qb').init(options, backend)` require an options object. In addition to fields listed for `qb`, `qb-relyq` has some more specific options.


- `prefix: 'my-services'` (default: 'qb') The [relyq](https://github.com/Rafflecopter/relyq) service prefix for Redis queue keys. (Service endpoints will take the type name after the prefix.) This should be unique for each type of service. So two qb instances that share the same prefix will share the same queues, which is good for redundancy but bad for different instances

- `clean_finish: true` (default: true) If true, no jobs are kept after being successfully finished.
- `delimeter: ':'` (default: ':') Sets the Redis delimeter
- `Q: relyq.RedisJsonQ` (defaults to RedisJsonQ) A [relyq](https://github.com/Rafflecopter/relyq) queue type to use. The suggested ones are `RedisJsonQ`, `RedisMsgPackQ`, and `MongoQ` (which only uses mongo for storing task objects, not the queue itself which is still in Redis).
  - If using `relyq.MongoQ`, additional options are required: `mongo: mongodb.mongoClient`, `db: dbname`, and `collection: collname`.
- `max_concurrent_callbacks: 100` (defaults to 100) Set the default max_concurrent_callbacks in case its not passed in on `.can`.
- `allow_defer: true` (defaults to true) Allows deferred tasks
  - `defer_field: 'when'` (defaults to 'when') Notes a field, that if filled and allow_defer is on, will create a deferred job deferred until the timestamp in the defer_field (which should be a javascript timestamp in milliseconds since 1970).
  - `defer_polling_interval: 1000` (in ms, defaults to 1s) Polling interval for deferred tasks to be pulled from the database. There is no blocking call so polling is our best choice.
- `allow_recur: true` (defaults to true) Allows recurring tasks
  - `recur_field: 'when'` (defaults to 'when') Notes a field, that if filled and allow_recur is on, will create a recurring job recurring every `task[recur_field]` (in ms).
  - `recur_polling_interval: 60000` (in ms, defaults to 60s) Polling interval for recurring tasks to be pulled from the database. There is no blocking call so polling is our best choice.

## Notes

- Recurring tasks must include an ID so that they are not duplicated. The ID field defaults to 'id'.

## License

MIT in LICENSE file
