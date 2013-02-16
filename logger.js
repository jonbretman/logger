(function () {

    /**
     * Stores all created LOGGERS.
     * @type {Object}
     */
    var LOGGERS = {};

    /**
     * Stores all logs
     * @type {Object}
     */
    var LOGS = {
        all: []
    };

    /**
     * The available logging levels
     * @type {Array}
     */
    var LOGGING_LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

    /**
     * Default configuration
     * @type {Object}
     */
    var CONFIG = {
        'rootLogger': 'DEBUG',
        'showTime': true,
        'out': 'console',
        'remoteLoggingPort': 1337
    };

    /**
     * Returns true if name is a wildcard e.g. 'Controller::*'
     * @param name
     * @return {Boolean}
     */
    var isWildcard = function (name) {
        return name.match(/.+?::\*/) !== null;
    };

    /**
     * Returns the wildcard that would match this loggers name.
     * @param name Name of logger
     * @return {String} Wildcard or null, e.g. if name was 'Controller::people-nearby-page' then 'Controller::*' would be returned
     */
    var getWildcard = function (name) {
        return name.indexOf('::') !== -1 ? name.substring(0, name.indexOf('::')) + '::*' : null;
    };

    /**
     * Returns true if a log message should be sent to the console.
     * @param type
     * @param name
     * @return {Boolean}
     */
    var shouldLog = function (type, name) {

        var wildcard = getWildcard(name);

        // specific rule for this logger
        if (CONFIG[name] && LOGGING_LEVELS[CONFIG[name]] !== -1) {
            return LOGGING_LEVELS.indexOf(type) >= LOGGING_LEVELS.indexOf(CONFIG[name]);
        }

        // wildcard rule
        if (wildcard && CONFIG[wildcard] && LOGGING_LEVELS[CONFIG[wildcard]] !== -1) {
            return LOGGING_LEVELS.indexOf(type) >= LOGGING_LEVELS.indexOf(CONFIG[wildcard]);
        }

        // no logging
        if (CONFIG.rootLogger === 'NONE') {
            return false;
        }

        // check root logging level
        return LOGGING_LEVELS.indexOf(type) >= LOGGING_LEVELS.indexOf(CONFIG.rootLogger);

    };

    /**
     * Gets a date string to use for log messages.
     * @return {String}
     */
    var getTime = function () {
        return new Date().toTimeString().match(/[\d:]+/)[0];
    };

    /**
     * Parses a message so that something useful is shown in logs.
     * @param message
     * @param recursive Can be the string 'object' or 'array'. Determines how things are handled.
     * @return {String}
     */
    var getMessage = function (message, recursive) {

        var type = Object.prototype.toString.call(message).match(/\[object ([a-zA-Z]*?)\]/)[1].toLowerCase();

        // strings and numbers are fine
        if (type === 'string' || type === 'number') {
            return message;
        }

        // for booleans cast to string with type in brackets, unless this is a recursive object check
        if (type === 'boolean') {
            return recursive === 'object' ? message : '(Boolean)' + message;
        }

        // for undefined and null [object Null] or [object Undefined] is clear
        if (type === 'undefined' || type === 'null') {
            return Object.prototype.toString.call(message);
        }

        // summarise functions
        if (type === 'function') {
            message = message.toString().split("\n")[0];
            return message.indexOf('[native code]') !== -1 ? message : message.replace(/\).*/, ') { [awesome code] }');
        }

        // iterate over arrays to make sure everything inside them is handled properly
        if (type === 'array') {
            var newArr = [];
            for (var i = 0; i < message.length; i++) {
                newArr.push(getMessage(message[i], 'array'));
            }

            // if recursive then return array
            if (recursive === 'object' || recursive === 'array') {
                return newArr;
            }

            // else return a string
            message = JSON.stringify({a: newArr});
            return message.substring(5, message.length - 1);
        }

        // treat everything else as an object
        var obj = {};
        for (var prop in message) {
            obj[prop] = getMessage(message[prop], 'object');
        }

        // if recursive then return object, else return a string
        return recursive === 'object' || recursive === 'array' ? obj : JSON.stringify(obj);

    };

    /**
     * Creates a logging function.
     * @param name
     * @param type
     * @return {Function}
     */
    var getLoggingMethod = function (name, type) {

        return function (message) {

            var args = Array.prototype.slice.call(arguments);
            var parsedMessage = [];

            // concatenate multiple arguments e.g. log.debug('Person object was', personObject, 'and array of data was', [1,2,3,4]);
            for (var i = 0; i < args.length; i++) {
                parsedMessage.push(getMessage(args[i]));
            }

            // build log message
            message = (CONFIG.showTime ? getTime() + ' ' : '') + '[' + name + '] ' + type + ' ' + parsedMessage.join(' ');

            // save the message
            LOGS.all.push(message);
            LOGS[name].push(message);

            // see if this should be logged to console
            if (shouldLog(type, name)) {
                sendLog(message);
            }
        };

    };

    /**
     * Logs a message or an array of messages to the output method defined in the CONFIG.
     * @param message
     */
    var sendLog = function (message) {

        // normalise to an array
        message = typeof message === 'string' ? [message] : message;

        // custom output function
        if (Object.prototype.toString.call(CONFIG.out) === '[object Function]') {
            CONFIG.out(message);
            return;
        }

        // standard console output
        console.log(message.length === 1 ? message[0] : message.join("\n"));

    };

    /**
     * Globally exposed Logger object.
     * @type {Object}
     */
    var Logger = {

        /**
         * Gets a logger. If the logger does not exist it is created.
         * @param name
         * @return {*}
         */
        getLogger: function (name) {

            if (!name) {
                throw new Error("A Logger must have a name");
            }

            if (LOGGERS[name]) {
                return LOGGERS[name];
            }

            var logger = {};

            for (var i = 0; i < LOGGING_LEVELS.length; i++) {
                logger[LOGGING_LEVELS[i].toLowerCase()] = getLoggingMethod(name, LOGGING_LEVELS[i]);
            }

            LOGGERS[name] = logger;
            LOGS[name] = [];

            return LOGGERS[name];

        },

        /**
         * Sets configuration options.
         * @param opts
         */
        config: function (opts) {
            for (var k in opts) {
                CONFIG[k] = opts[k];
            }
        },

        /**
         * Dumps logs to the output method. If the name of a logger is passed then only that LOGGERS logs are dumped.
         * @param name Can be the name of a logger or a wildcard eg. 'Controller::*' will dump both 'Controller::people-nearby' and 'Controller::photo-rating'
         */
        dump: function (name) {

            // dump all
            if (arguments.length === 0) {
                sendLog(LOGS.all);
                return;
            }

            // if name is not string return
            if (typeof name !== 'string') {
                return;
            }

            // dump a specific log
            if (LOGS[name]) {
                sendLog(LOGS[name]);
                return;
            }

            // check for wildcard
            if (!isWildcard(name)) {
                return;
            }

            name = name.substring(0, name.length - 3);
            var regExp = new RegExp(' \\[' + name + '::.*?\\] ');
            var matchedLogs = [];

            // check for matches
            for (var i = 0; i < LOGS.all.length; i++) {
                if (LOGS.all[i].match(regExp) !== null) {
                    matchedLogs.push(LOGS.all[i]);
                }
            }

            // if wildcard matched any logs then dump them
            if (matchedLogs.length > 0) {
                sendLog(matchedLogs);
            }

        }

    };

    // expose the Logger
    window.Logger = Logger;

})();
