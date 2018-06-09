'use strict';

/* global config, logger */

const bodyParser = require('body-parser');
const express = require('express');
const errorhandler = require('errorhandler');
const methodOverride = require('method-override');
const compression = require('compression');
const morgan = require('morgan');
const async = require('async');
const http = require('http');
const tcpPortUsed = require('tcp-port-used');

module.exports = {
    init: function (params, callback, done) {

        var self = this;

        params = params || {};

        this.app = express();

        this.app.set('views', './views');
        this.app.set('view engine', 'pug');
        this.app.set('view cache', config.view.cache);

        if (config.express.logger) {
            this.app.use(morgan('dev'));
        }

        this.app.use(errorhandler({
            dumpExceptions: config.debug,
            showStack: config.debug
        }));

        this.app.use(methodOverride());

        if (config.express.compression) {
            this.app.use(compression());
        }

        this.app.use(bodyParser.json());

        this.app.use(bodyParser.urlencoded({
            extended: true,
            parameterLimit: 100000
        }));

        this.app.use(function (req, res, next) {

            res.header('Access-Control-Allow-Origin', config.cors.AccessControlAllowOrigin);
            res.header('Access-Control-Allow-Methods', config.cors.AccessControlAllowMethods);
            res.header('Access-Control-Allow-Headers', config.cors.AccessControlAllowHeaders);
            res.header('Access-Control-Allow-Credentials', config.cors.AccessControlAllowCredentials);
            res.header('Access-Control-Max-Age', config.cors.AccessControlMaxAge);
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.header('Pragma', 'no-cache');
            res.header('Expires', 0);

            if (req.method === 'OPTIONS') {

                return res.send(204);
            }

            return next();
        });

        return callback.call(self, null, function () {

            return done.call(self);
        });
    },
    add: function (params, callback) {

        callback = callback || function () {};

        var group = params.group;

        var server = http.createServer(this.app);

        server.setTimeout(3600 * 1000);

        var port = null;

        return async.eachSeries(config.http[group].pool, (_port, next) => {

            return tcpPortUsed.check(_port, 'localhost').then(function (inUse) {

                if (!inUse) {

                    port = _port;

                    return server.listen(port, function () {

                        return next(true);
                    });
                }

                return next();
            }, () => {

                return next();
            });

        }, function (err) {

            if (err !== true) {

                if (!err) {

                    err = {
                        message: 'No free port found for pool'
                    };
                }

                logger.error('http/' + group + ' error', err, group);

                return callback(err);
            }

            logger.info('http/' + group + ' is listenning on port: ' + port);

            return callback();
        });
    }
};