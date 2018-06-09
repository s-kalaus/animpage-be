'use strict';

/* global config */

var PaymentService = require('../../service/payment.service');
var swaggerUtil = require('../../lib/swagger');

var PageApi = {

    add: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PaymentService.add(params, function (result) {

                return res.json(result);
            });
        });
    },

    remove: function (req, res) {

        return swaggerUtil.checkCustomer(req, function (err, params) {

            if (err) {
                return res.json(err);
            }

            return PaymentService.remove(params, function (result) {

                return res.json(result);
            });
        });
    }
};

module.exports = PageApi;