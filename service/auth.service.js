'use strict';

/* global config */

const jwt = require('jsonwebtoken');
const async = require('async');
const _ = require('lodash');
const expressJwt = require('express-jwt');
const moment = require('moment');
const shopifyAPI = require('shopify-node-api');
const randomString = require('../lib/randomString');
const Customers = require('../model').Customers;
const ShopAccounts = require('../model').ShopAccounts;
const AccessTokens = require('../model').AccessTokens;

var logger = require('../lib/logger')({
    prefix: 'auth'
});

var AuthService = {

    open: (params, callback) => {

        const shop = params.shop || null;
        const code = params.code || null;
        const hmac = params.hmac || null;
        const timestamp = params.timestamp || null;
        const state = params.state || null;

        let shopify = null;
        let redirectUrl = config.url;
        let shopAccount = null;
        let customer = null;
        let nonce = null;
        let token = null;
        let email = null;
        let name = null;
        let tokenLocal = null;
        let ext = [];

        const PaymentService = require('./payment.service');

        function updateShopAccount(data, done) {

            return async.series([
                (next) => {

                    return shopAccount.update(data, Object.keys(data)).then((_shopAccount) => {

                        shopAccount = _shopAccount;

                        return next();
                    }).catch((err) => {

                        return next({success: false, message: 'DB Error', original: err});
                    });
                }
            ], done);
        }

        function createShopify(data) {

            shopify = new shopifyAPI(Object.assign({
                shop: shop,
                shopify_api_key: config.shopify.key,
                shopify_shared_secret: config.shopify.secret,
                shopify_scope: 'read_themes,write_themes,read_content',
                redirect_uri: config.url + '/v1/auth'
            }, data));
        }

        function fetchShop(done) {

            return async.series([
                (next) => {

                    return shopify.get('/admin/shop.json', (err, data) => {

                        if (err) {

                            token = null;
                            email = null;
                            name = null;

                            return next();
                        }

                        email = data.shop.email;
                        name = data.shop.shop_owner;

                        return next();
                    });
                },
                (next) => {

                    if (!email || !name) {
                        return next();
                    }

                    return PaymentService.checkSubscription({
                        token,
                        uid: shop
                    }, (result) => {

                        if (result.success && result.data) {
                            ext.push('subscription');
                        }

                        return next();
                    });
                }
            ], done);
        }

        return async.series([
            (next) => {

                return ShopAccounts.findOrCreate({
                    where: {
                        type: 'shopify',
                        uid: shop
                    },
                    defaults: {
                        nonce: randomString(32)
                    }
                }).spread((_shopAccount) => {

                    shopAccount = _shopAccount;
                    token = shopAccount.token;
                    nonce = shopAccount.nonce;

                    createShopify({
                        nonce: shopAccount.nonce,
                        access_token: shopAccount.token
                    });

                    return next();
                }).catch((err) => {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                if (!token || code) {
                    return next();
                }

                return fetchShop(next);
            },
            (next) => {

                if (code || email || token) {
                    return next();
                }

                return shopAccount.update({
                    nonce: randomString(32),
                    token: null
                }, ['nonce', 'token']).then((_shopAccount) => {

                    shopAccount = _shopAccount;

                    createShopify({
                        nonce: shopAccount.nonce
                    });

                    redirectUrl = shopify.buildAuthURL();

                    return next(true);
                }).catch((err) => {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                if (email || token) {
                    return next();
                }

                return shopify.exchange_temporary_token({shop, code, hmac, timestamp, state}, (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Auth Error', original: err});
                    }

                    token = data.access_token;

                    redirectUrl = 'https://' + shop + '/admin/apps/' + config.shopify.name;

                    createShopify({
                        access_token: token
                    });

                    return updateShopAccount({token}, next);
                });
            },
            (next) => {

                if (email) {
                    return next();
                }

                return fetchShop(next);
            },
            (next) => {

                let def = {};

                if (name) {
                    def.name = name;
                }

                return Customers.findOrCreate({
                    where: {
                        email: email
                    },
                    defaults: def
                }).spread((_customer) => {

                    customer = _customer;

                    return next();
                }).catch((err) => {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                if (customer.customerId === shopAccount.customerId) {
                    return next();
                }

                return updateShopAccount({
                    customerId: customer.customerId
                }, next);
            },
            (next) => {

                return AuthService.oauthCreateToken({
                    customerId: customer.customerId,
                    shopAccountId: shopAccount.shopAccountId,
                    scope: 'all',
                    ext
                }, (result) => {

                    if (result.success && result.data.token) {
                        tokenLocal = result.data.token;
                    }

                    return next();
                });
            },
            (next) => {

                return AuthService.install({
                    shopAccountId: shopAccount.shopAccountId
                }, () => {

                    return next();
                });
            }
        ], (err) => {

            if (err && err !== true) {

                logger.error('open', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: {
                    redirectUrl: redirectUrl,
                    token: tokenLocal
                }
            });
        });
    },

    oauthAuthorize: function (params, callback) {

        var validateJwt = expressJwt({
            secret: config.oauth.secret
        });
        var token = 'error';
        var tokenRemote = null;
        var scopeRemote = params.scope;
        var scope = [];
        var customer = null;

        if (!params.req) {

            params.req = {
                headers: {

                    // Empty
                }
            };
        }

        if (!params.req.headers.authorization && params.req.query && params.req.query.authorization) {
            params.req.headers.authorization = 'Bearer ' + params.req.query.authorization;
        }

        if (!params.req.headers.authorization && params.authorization) {
            params.req.headers.authorization = 'Bearer ' + params.authorization;
        }

        return async.series([
            function (next) {

                if ((!scopeRemote || !scopeRemote.length) && !params.req.headers.authorization) {
                    return next(true);
                }

                if (!params.req.headers.authorization) {
                    return next({success: false, message: 'No authorization header'});
                }

                token = params.req.headers.authorization.replace(/^Bearer\ /, '');

                if (!token) {
                    return next({success: false, message: 'No token found in header'});
                }

                return validateJwt(params.req, params.req.res, function () {

                    if (!params.req.user) {
                        return next({success: false, message: 'No token found'});
                    }

                    tokenRemote = params.req.user;

                    return next();
                });
            },
            function (next) {

                return AccessTokens.find({
                    where: {
                        token: token
                    }
                }).then(function (accessToken) {

                    if (!accessToken) {
                        return next({success: false, message: 'No token found'});
                    }

                    if (accessToken.isRevoked) {
                        return next({success: false, message: 'Token revoked'});
                    }

                    if (accessToken.expireDTS && (new moment(accessToken.expireDTS)).isBefore(new moment())) {
                        return next({success: false, message: 'Token expired'});
                    }

                    if (!tokenRemote.customerId || tokenRemote.customerId !== accessToken.customerId) {
                        return next({success: false, message: 'Token broken'});
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (!tokenRemote.customerId) {
                    return next();
                }

                const incl = [];

                if (tokenRemote.shopAccountId) {

                    incl.push({
                        model: AccessTokens,
                        required: true,
                        include: [
                            {
                                model: ShopAccounts,
                                attributes: ['token', 'uid', 'shopAccountId'],
                                where: {
                                    shopAccountId: tokenRemote.shopAccountId
                                },
                                required: true
                            }
                        ]
                    });
                }

                return Customers.find({
                    where: {
                        customerId: tokenRemote.customerId
                    },
                    include: incl
                }).then(function (_customer) {

                    if (!_customer) {
                        return next({success: false, message: 'Customer not found'});
                    }

                    customer = _customer;

                    scope = config.oauth.scope.customer;

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (params.scope === 'all') {
                    scopeRemote = scope;
                }

                var diff = _.difference(scopeRemote, scope);

                if (diff.length) {
                    return next({success: false, message: 'Scope mismatch: ' + diff.join(', ')});
                }

                if (customer.AccessTokens[0].ShopAccount) {
                    params.req.user.shopAccountId = customer.AccessTokens[0].ShopAccount.shopAccountId;
                    params.req.user.token = customer.AccessTokens[0].ShopAccount.token;
                    params.req.user.uid = customer.AccessTokens[0].ShopAccount.uid;
                    params.req.user.ext = customer.AccessTokens[0].ext;
                }

                return next();
            },
            function (next) {



                return next();
            }
        ], function (err) {

            if (err && err !== true) {

                logger.error('oauthAuthorize', err);

                return callback(err);
            }

            return callback({
                success: true
            });
        });
    },

    oauthCreateToken: function (params, callback) {

        var token = 'error';
        var customer = null;
        var scopeRemote = [];
        var scope = [];
        var ext = (params.ext || []).join(',') || null;

        return async.series([
            function (next) {

                if (!params.scope) {
                    return next({success: false, message: 'Scope not set'});
                }

                scopeRemote = params.scope.split(',');

                return next();
            },
            function (next) {

                return Customers.find({
                    where: {
                        customerId: params.customerId
                    }
                }).then(function (_customer) {

                    if (!_customer) {
                        return next({success: false, message: 'Customer not found'});
                    }

                    customer = _customer;

                    scope = config.oauth.scope.customer;

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (params.scope === 'all') {
                    scopeRemote = scope;
                }

                var diff = _.difference(scopeRemote, scope);

                if (diff.length) {
                    return next({success: false, message: 'Scope mismatch: ' + diff.join(', ')});
                }

                return next();
            },
            function (next) {

                return AccessTokens.find({
                    where: {
                        customerId: customer.customerId,
                        isRevoked: false,
                        scope: params.scope,
                        ext: ext
                    }
                }).then(function (accessToken) {

                    if (accessToken) {
                        token = accessToken.token;
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (token !== 'error') {
                    return next();
                }

                token = jwt.sign({
                    customerId: customer.customerId,
                    shopAccountId: params.shopAccountId || null,
                    login: customer.login,
                    name: customer.name,
                    ext: ext,
                    string: randomString(5)
                }, config.oauth.secret, {
                    expiresIn: config.oauth.expire
                });

                return AccessTokens.create({
                    token: token,
                    customerId: customer ? customer.customerId : null,
                    shopAccountId: params.shopAccountId || null,
                    scope: params.scope,
                    ext: ext,
                    expireDTS: (new moment()).add(config.oauth.expire, 'seconds')
                }).then(function () {

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            }
        ], function (err) {

            if (err) {

                logger.error('oauthCreateToken', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: {
                    token
                }
            });
        });
    },

    install: (params, callback) => {

        const shopAccountId = params.shopAccountId || null;

        let shop = null;
        let shopify = null;
        let mainThemeId = null;
        let mainThemeContent = null;
        let uninstallWebhookId = null;

        return async.series([
            (next) => {

                return ShopAccounts.find({
                    where: {
                        shopAccountId: shopAccountId
                    }
                }).then((shopAccount) => {

                    shop = shopAccount.uid;

                    shopify = new shopifyAPI({
                        shop: shopAccount.uid,
                        access_token: shopAccount.token
                    });

                    return next();
                }).catch((err) => {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                return shopify.get('/admin/webhooks.json', {
                    topic: 'app/uninstalled',
                    address: config.url + '/v1/auth/webhook',
                    format: 'json'
                }, (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Error Fetching Webhooks', original: err});
                    }

                    uninstallWebhookId = data.webhooks.length ? data.webhooks[0].id : null;

                    return next();
                });
            },
            (next) => {

                if (uninstallWebhookId) {
                    return next();
                }

                return shopify.post('/admin/webhooks.json', {
                    webhook: {
                        topic: 'app/uninstalled',
                        address: config.url + '/v1/auth/webhook',
                        format: 'json'
                    }
                }, (err) => {

                    if (err) {
                        return next({success: false, message: 'Error Adding Uninstall Webhook', original: err});
                    }

                    return next();
                });
            },
            (next) => {

                return shopify.get('/admin/themes.json', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Error Fetching Themes', original: err});
                    }

                    mainThemeId = data.themes.filter((theme) => theme.role === 'main')[0].id;

                    if (!mainThemeId) {
                        return next({success: false, message: 'Main Theme Not Found'});
                    }

                    return next();
                });
            },
            (next) => {

                return shopify.get('/admin/themes/' + mainThemeId + '/assets.json?asset[key]=layout/theme.liquid', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Error Fetching Themes', original: err});
                    }

                    mainThemeContent = data.asset.value;

                    if (!mainThemeContent) {
                        return next({success: false, message: 'Main Theme Content Not Defined'});
                    }

                    if (mainThemeContent.indexOf('<!-- ANIMPAGE START -->') !== -1 && mainThemeContent.indexOf('<!-- ANIMPAGE END -->') !== -1) {
                        return next(true);
                    }

                    return next();
                });
            },
            (next) => {

                mainThemeContent = mainThemeContent.replace(/\<\/head\>/i, '<!-- ANIMPAGE START --><link href="' + config.url + '/v1/asset/' + shop + '.css" rel="stylesheet" type="text/css" media="all" /><script src="' + config.url + '/v1/asset/' + shop + '.js"></script><!-- ANIMPAGE END --></head>');

                return shopify.put('/admin/themes/' + mainThemeId + '/assets.json', {
                    asset: {
                        key: 'layout/theme.liquid',
                        value: mainThemeContent
                    }
                }, (err) => {

                    if (err) {
                        return next({success: false, message: 'Error Updating Theme', original: err});
                    }

                    return next();
                });
            }
        ], (err) => {

            if (err && err !== true) {

                logger.error('install', err);

                return callback(err);
            }

            return callback({
                success: true
            });
        });
    },

    uninstall: (params, callback) => {

        const shopAccountId = params.shopAccountId || null;
        const uid = params.uid || null;

        let shop = null;
        let shopify = null;
        let mainThemeId = null;
        let mainThemeContent = null;
        let redirectUrl = null;

        return async.series([
            (next) => {

                if (!uid) {
                    return next({success: false, message: 'Shop Not Set'});
                }

                return ShopAccounts.find({
                    where: {
                        shopAccountId: shopAccountId
                    }
                }).then((shopAccount) => {

                    shop = shopAccount.uid;

                    shopify = new shopifyAPI({
                        shop: shopAccount.uid,
                        access_token: shopAccount.token
                    });

                    return next();
                }).catch((err) => {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                return shopify.get('/admin/themes.json', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Error Fetching Themes', original: err});
                    }

                    mainThemeId = data.themes.filter((theme) => theme.role === 'main')[0].id;

                    if (!mainThemeId) {
                        return next({success: false, message: 'Main Theme Not Found'});
                    }

                    return next();
                });
            },
            (next) => {

                return shopify.get('/admin/themes/' + mainThemeId + '/assets.json?asset[key]=layout/theme.liquid', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Error Fetching Themes', original: err});
                    }

                    mainThemeContent = data.asset.value;

                    if (!mainThemeContent) {
                        return next({success: false, message: 'Main Theme Content Not Defined'});
                    }

                    if (mainThemeContent.indexOf('<!-- ANIMPAGE START -->') === -1 || mainThemeContent.indexOf('<!-- ANIMPAGE END -->') === -1) {
                        mainThemeContent = null;
                    }

                    return next();
                });
            },
            (next) => {

                if (!mainThemeContent) {
                    return next();
                }

                mainThemeContent = mainThemeContent.replace(/\<\!\-\-\ ANIMPAGE\ START\ \-\-\>.*?\<\!\-\-\ ANIMPAGE\ END\ \-\-\>/i, '');

                return shopify.put('/admin/themes/' + mainThemeId + '/assets.json', {
                    asset: {
                        key: 'layout/theme.liquid',
                        value: mainThemeContent
                    }
                }, (err) => {

                    if (err) {
                        return next({success: false, message: 'Error Updating Theme', original: err});
                    }

                    return next();
                });
            },
            (next) => {

                return shopify.delete('/admin/api_permissions/current.json', (err) => {

                    if (err) {
                        return next({success: false, message: 'Error Uninstalling App', original: err});
                    }

                    redirectUrl = 'https://' + uid + '/admin/apps';

                    return next();
                });
            }
        ], (err) => {

            if (err && err !== true) {

                logger.error('uninstall', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: {
                    redirectUrl
                }
            });
        });
    }//,

//    webhook: (params, callback) => {
//
//        const shop = params.headers['x-shopify-shop-domain'] || null;
//        const topic = params.headers['x-shopify-topic'] || null;
//
//        let shopAccount = null;
//
//        return async.series([
//            (next) => {
//
//                if (!shop) {
//                    return next({success: false, message: 'Shop Not Set'});
//                }
//
//                if (topic !== 'app/uninstalled') {
//                    return next({success: false, message: 'Invalid Topic'});
//                }
//
//                return ShopAccounts.find({
//                    where: {
//                        uid: shop
//                    }
//                }).then((_shopAccount) => {
//
//                    if (!_shopAccount) {
//                        return next({success: false, message: 'Shop Not Found'});
//                    }
//
//                    shopAccount = _shopAccount;
//
//                    return next();
//                }).catch((err) => {
//
//                    return next({success: false, message: 'DB Error', original: err});
//                });
//
//                return next();
//            },
//            (next) => {
//
//                return AuthService.uninstall({
//                    shopAccountId: shopAccount.shopAccountId
//                }, () => {
//
//                    return next();
//                });
//            },
//            (next) => {
//
//                return shopAccount.update({
//                    token: null
//                }, ['token']).then((_shopAccount) => {
//
//                    shopAccount = _shopAccount;
//
//                    return next(true);
//                }).catch((err) => {
//
//                    return next({success: false, message: 'DB Error', original: err});
//                });
//            }
//        ], (err) => {
//
//            if (err && err !== true) {
//
//                logger.error('webhook', err);
//
//                return callback(err);
//            }
//
//            return callback({
//                success: true
//            });
//        });
//    }
};

module.exports = AuthService;
