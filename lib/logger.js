'use strict';

var winston = require('winston');
var moment = require('moment');

module.exports = function (params) {

    params = params || {};

    var d = {
        transports: [
            new (winston.transports.Console)({
                colorize: true,
                timestamp: function () {
                    return moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                }
            })
        ]
    };

    if (!process.exceptionHandlersInited) {

        d.exceptionHandlers = [
            new (winston.transports.Console)({
                colorize: true,
                timestamp: function () {
                    return moment(new Date(), 'YYYY-MM-DD HH:mm:ss');
                }
            })
        ];

        process.exceptionHandlersInited = true;
    }

    return new (winston.Logger)(d);
};