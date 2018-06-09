'use strict';

/* global config */

var AuthService = require('../../service/auth.service');
var swaggerUtil = require('../../lib/swagger');

var AuthApi = {

    open: function (req, res) {

        return AuthService.open(swaggerUtil.formatParams(req), (result) => {

            if (!result.success) {
                return res.redirect(config.url);
            }

            res.cookie('token', result.success && result.data.token ? result.data.token : null, {
                domain: config.cookie.domain,
                secure: true,
                path: '/',
                maxAge: config.cookie.lifetime * 1000
            });

            return res.redirect(result.data.redirectUrl);
        });
    },

//    webhook: function (req, res) {
//
//        return AuthService.webhook({
//            headers: req.headers,
//            data: req.body
//        }, (result) => {
//
//            return res.sendStatus(result.success ? 200 : 500);
//        });
//    },

    uninstall: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return AuthService.uninstall(params, function (result) {

                return res.json(result);
            });
        });
    }
};

module.exports = AuthApi;