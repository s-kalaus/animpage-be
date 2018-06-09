'use strict';

/* global config */

var PageService = require('../../service/page.service');
var swaggerUtil = require('../../lib/swagger');

var PageApi = {

    list: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PageService.list(params, function (result) {

                return res.json(result);
            });
        });
    },

    show: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PageService.show(params, function (result) {

                return res.json(result);
            });
        });
    },

    save: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PageService.save(params, function (result) {

                return res.json(result);
            });
        });
    },

    remove: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PageService.remove(params, function (result) {

                return res.json(result);
            });
        });
    }
};

module.exports = PageApi;