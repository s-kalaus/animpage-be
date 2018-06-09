'use strict';

/* global config */

const async = require('async');
const shopifyAPI = require('shopify-node-api');
const PageConfigs = require('../model').PageConfigs;

var logger = require('../lib/logger')({
    prefix: 'payment'
});

var PaymentService = {

    add: (params, callback) => {

        const token = params.token || null;
        const uid = params.uid || null;
        const customerId = params.customerId || null;

        let redirectUrl = 'https://' + uid + '/admin/apps/' + config.shopify.name;

        const shopify = new shopifyAPI({
            shop: uid,
            access_token: token
        });

        return async.series([
            (next) => {

                const data = {
                    name: 'Subcription Charge ' + uid,
                    price: config.subscription.price,
                    return_url: redirectUrl
                };

                if (config.subscription.test) {
                    data.test = true;
                }

                return shopify.post('/admin/recurring_application_charges.json', {
                    recurring_application_charge: data
                }, (err, data) => {

                    if (err || data.recurring_application_charge.status !== 'pending' || !data.recurring_application_charge.confirmation_url) {
                        return next({success: false, message: 'Shopify Payment Error', original: err});
                    }

                    redirectUrl = data.recurring_application_charge.confirmation_url;

                    return next();
                });
            }
        ], (err) => {

            if (err) {

                logger.error('add', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: {
                    redirectUrl
                }
            });
        });
    },

    checkSubscription: (params, callback) => {

        const token = params.token || null;
        const uid = params.uid || null;

        let subscription = null;

        const shopify = new shopifyAPI({
            shop: uid,
            access_token: token
        });

        return async.series([
            (next) => {

                return shopify.get('/admin/recurring_application_charges.json', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Shopify Error', original: err});
                    }

                    const found = (data.recurring_application_charges || []).filter(charge => {

                        return (charge.status === 'active' || charge.status === 'accepted') && charge.name.match(new RegExp('^Subcription Charge ' + uid + '$', 'i')) && charge.decorated_return_url.indexOf('https://' + uid + '/admin/apps/' + config.shopify.name) === 0;
                    });

                    if (found.length) {
                        subscription = found[0];
                    }

                    return next();
                });
            },
            (next) => {

                if (!subscription || subscription.status !== 'accepted') {
                    return next();
                }

                return shopify.post('/admin/recurring_application_charges/' + subscription.id + '/activate.json', {}, (err, data) => {

                    subscription = !err && data.recurring_application_charge ? data.recurring_application_charge : null;

                    return next();
                });
            }
        ], (err) => {

            if (err) {

                logger.error('checkSubscription', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: subscription
            });
        });
    },

    remove: (params, callback) => {

        const token = params.token || null;
        const uid = params.uid || null;
        const shopAccountId = params.shopAccountId || null;

        const shopify = new shopifyAPI({
            shop: uid,
            access_token: token
        });

        let subscription = null;
        let pageConfigs = [];

        function processItem(pageConfig, done) {

            return async.series([
                (next) => {

                    let d = {};

                    if (pageConfig.inEffect && ['fadeIn', 'bounceIn', 'rotateIn'].indexOf(pageConfig.inEffect) === -1) {
                        d.inEffect = 'fadeIn';
                    }

                    if (pageConfig.outEffect && ['fadeOut', 'bounceOut', 'rotateOut'].indexOf(pageConfig.outEffect) === -1) {
                        d.outEffect = 'fadeOut';
                    }

                    if (!Object.keys(d).length) {
                        return next();
                    }

                    return pageConfig.update(d, Object.keys(d)).then(function (_pageConfig) {

                        pageConfig = _pageConfig;

                        return next();
                    }).catch(function (err) {

                        return next({success: false, message: 'DB Error', original: err});
                    });
                },
                (next) => {

                    if (['all', 'home'].indexOf(pageConfig.pageId) !== -1) {
                        return next();
                    }

                    return pageConfig.destroy().then(function () {

                        return next();
                    }).catch(function (err) {

                        return next({success: false, message: 'DB Error', original: err});
                    });
                }
            ], done);
        }

        return async.series([
            (next) => {

                return PaymentService.checkSubscription({
                    token,
                    uid: uid
                }, (result) => {

                    if (!result.success || !result.data) {
                        return next({success: false, message: 'Subscription Not Found'});
                    }

                    subscription = result.data;

                    return next();
                });
            },
            (next) => {

                return shopify.delete('/admin/recurring_application_charges/' + subscription.id + '.json', (err) => {

                    if (err) {
                        return next({success: false, message: 'Shopify Error', original: err});
                    }

                    return next();
                });
            },
            (next) => {

                return PageConfigs.findAll({
                    where: {
                        shopAccountId: shopAccountId
                    }
                }).then(function (_pageConfigs) {

                    if (_pageConfigs) {
                        pageConfigs = _pageConfigs;
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                return async.each(pageConfigs, processItem, next);
            }
        ], (err) => {

            if (err) {

                logger.error('add', err);

                return callback(err);
            }

            return callback({
                success: true
            });
        });
    }
};

module.exports = PaymentService;
