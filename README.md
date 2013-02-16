## Logger

### Usage

```javascript
// get a logger
var log = Logger.getLogger('my-logger');

// log things
log.debug('My debug message');

/**
 * will output something like:
 * 12:30:32 [my-logger] DEBUG My debug message
 */

// if logging objects, arrays, or anything apart from a string pass as separate arguments
log.debug('Logging an object', {name: 'Jon'}, [1,2,3,4]);

/**
 * will output something like:
 * 12:30:32 [my-logger] DEBUG Logging an object {"name","Jon"} [1,2,3,4]
 */
```

A Logger object has four logging methods:

```javascript
log.debug();
log.info();
log.warn();
log.error();
```

### Types

Everything is converted to a string that should be useful in logs.

* **Booleans** become either `(Boolean)true` or `(Boolean)false` unless they are in an object
* **Undefined and Null** become `[object Undefined]` and `[object Null]`
* **Functions** become something like: `function (param1,param2) { [awesome code] }`

### Configuring

Configuring is pretty straight forward.

```javascript
Logger.config({
    'rootLogger': 'WARN', // only display WARN level logs or higher for everything
    'special-logger': 'DEBUG' // for this logger display DEBUG and higher
});
```

It is possible to use namespaces like `Controller::people-nearby` and `Model::folder`. You can then use wildcards to set the configuration. For example:

```javascript
var Logger.config({
    'rootLogger': 'NONE', // don't display any logs
    'Model::*': 'DEBUG' // for all Model instances show DEBUG and higher logs
});
```

There are four logging levels, **DEBUG**, **INFO**, **WARN**, and **ERROR**. It is also possible to use **NONE** to turn off logging completely.

### Dumping
The Logger keeps a record of all logs, even the ones that aren't displayed due the logging level set in the config. To dump logs use the dump method:

```javascript
Logger.dump(); // dumps all logs
Logger.dump('my-logger'); // dumps all 'my-logger' logs
Logger.dump('Model::*'); // dumps all logs with the 'Model::' namespace
```