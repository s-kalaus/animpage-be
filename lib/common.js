'use strict';

var _ = require('lodash');

module.exports = function (params) {

    params = params || {};

    var env = params.env || false;
    var loggerName = params.loggerName || 'common';

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    if (!global.app) {
        global.app = {};
    }

    global.app.mode = env || process.env.NODE_ENV || 'development';

    global.config = _.merge({
        database: {
            dialect: process.env.DB_DIALECT,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            db: process.env.DATABASE
        }
    }, require('../config/' + global.app.mode));

    global.logger = require('../lib/logger')({
        prefix: loggerName
    });
};
