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

## License

MIT in LICENSE file
