'use strict';

var _ = require('lodash');

module.exports = {
    security: {
        access_token: {
            type: 'apiKey',
            name: 'access_token',
            'in': 'header'
        }
    },
    formatParams: function (req, ex, noSetUser) {

        var ret = {};
        var params = req.swagger.params || {};

        for (var k in params) {
            ret[k] = params[k].value;
        }

        if (ex) {
            _.extend(ret, ex);
        }

        if (req.user && req.user.userId && !noSetUser) {
            ret.userId = req.user.userId;
        }

        return ret;
    },
    checkCustomer: function (req, done) {

        var params = this.formatParams(req);

        if (req.user && req.user.customerId && !req.user.userId) {

            if (params.customerId && params.customerId !== 'me') {

                return done({
                    success: false,
                    message: 'You are not allowed to view other customers'
                });
            }

            params.customerId = req.user.customerId;
            params.token = req.user.token;
            params.uid = req.user.uid;
            params.ext = req.user.ext;
            params.shopAccountId = req.user.shopAccountId;
        }

        if (req.user && req.user.userId && params.customerId === 'me') {

            return done({
                success: false,
                message: 'Customer ID not specified'
            });
        }

        return done(null, params);
    }
};