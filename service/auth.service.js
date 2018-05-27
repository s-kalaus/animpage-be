'use strict';

/* global config */

var db = require('../lib/db');
var sequelize = db.sequelize();
var jwt = require('jsonwebtoken');
var async = require('async');
var crypto = require('crypto');
var _ = require('lodash');
var expressJwt = require('express-jwt');
var bcrypt = require('bcrypt-nodejs');
var Customers = require('../model').Customers;
var moment = require('moment');
var AccessTokens = require('../model').AccessTokens;
var randomString = require('../lib/randomString');

var logger = require('../lib/logger')({
    prefix: 'auth'
});

var AuthService = {

    oauthAuthorize: function (params, callback) {

        var validateJwt = expressJwt({
            secret: config.CustomerConfig.secret
        });
        var token = 'error';
        var tokenRemote = null;
        var scopeRemote = params.scope;
        var scope = [];
        var customer = null;
        var user = null;

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

        AuditService.addService({
            userId: null,
            customerId: null,
            service: 'auth',
            method: 'oauthAuthorize',
            step: 'start',
            meta: params
        });

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

                    if ((!tokenRemote.userId && !tokenRemote.customerId) || tokenRemote.userId !== accessToken.userId || tokenRemote.customerId !== accessToken.customerId) {
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

                return Customers.find({
                    where: {
                        customerId: tokenRemote.customerId,
                        isDeleted: false
                    }
                }).then(function (_customer) {

                    if (!_customer) {
                        return next();
                    }

                    customer = _customer;

                    scope = config.ServerConfig.oauth.scope.customer;

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (!tokenRemote.userId) {
                    return next();
                }

                return Users.find({
                    where: {
                        userId: tokenRemote.userId,
                        isDeleted: false,
                        isSuspended: false
                    }
                }).then(function (_user) {

                    if (!_user) {
                        return next();
                    }

                    user = _user;

                    scope = config.ServerConfig.oauth.scope.dashboard[user.role] || [];

                    if (user.hasQARights) {
                        scope.push.apply(scope, config.ServerConfig.oauth.scope.dashboard.qa);
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (!user && !customer) {
                    return next({success: false, message: 'User not found'});
                }

                if (params.scope === 'all') {
                    scopeRemote = scope;
                }

                var diff = _.difference(scopeRemote, scope);

                if (diff.length) {
                    return next({success: false, message: 'Scope mismatch: ' + diff.join(', ')});
                }

                return next();
            }
        ], function (err) {

            AuditService.addService({
                userId: null,
                customerId: null,
                service: 'auth',
                method: 'oauthAuthorize',
                step: 'finish',
                meta: params,
                user: user ? user.userId : null,
                customer: customer ? customer.customerId : null
            });

            if (err && err !== true) {

                logger.error('oauthAuthorize', err);

                if (err.db) {
                    return db.debugError(callback, err.db);
                }

                return callback(err);
            }

            return callback({
                success: true,
                userId: user ? user.userId : null,
                customerId: customer ? customer.customerId : null
            });
        });
    },

    oauthCreateToken: function (params, callback) {

        var token = 'error';
        var user = null;
        var customer = null;
        var scopeRemote = [];
        var scope = [];
        var ext = params.ext || null;
        var accessTokenExpire = typeof params.accessTokenExpire === 'undefined' ? config.ServerConfig.oauth.accessTokenExpire : params.accessTokenExpire;

        if (ext) {
            ext = JSON.stringify(ext);
        }

        AuditService.addService({
            userId: null,
            customerId: null,
            service: 'auth',
            method: 'oauthCreateToken',
            step: 'start',
            meta: params
        });

        return async.series([
            function (next) {

                if (!params.scope) {
                    return next({success: false, message: 'Scope not set'});
                }

                if (!params.redirect_uri) {
                    return next({success: false, message: 'Redirect Uri not set'});
                }

                if (params.state !== config.ServerConfig.oauth.state) {
                    return next({success: false, message: 'Incorrect state'});
                }

                if (params.realm !== config.ServerConfig.oauth.realm) {
                    return next({success: false, message: 'Incorrect realm'});
                }

                scopeRemote = params.scope.split(',');

                return next();
            },
            function (next) {

                var where = params.customerId ? {
                    customerId: params.customerId
                } : {
                    isDeleted: false,
                    email: params.login
                };

                return Customers.find({
                    where: where
                }).then(function (_customer) {

                    if (!_customer) {
                        return next();
                    }

                    return bcrypt.compare(params.password, _customer.passwordHash, function (err, res) {

                        if (!params.customerId && (err || !res)) {
                            return next();
                        }

                        customer = _customer;

                        scope = config.ServerConfig.oauth.scope.customer;

                        return next();
                    });
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (customer) {
                    return next();
                }

                return Users.find({
                    where: {
                        isDeleted: false,
                        isSuspended: false,
                        login: params.login
                    }
                }).then(function (_user) {

                    if (!_user) {
                        return next();
                    }

                    if (params.password) {

                        if (_user.passwordHash !== crypto.createHash('sha1').update(params.password + ':' + _user.salt).digest('hex')) {
                            return next();
                        }
                    } else if (params.hash) {

                        if (params.hash !== crypto.createHash('sha1').update(_user.login + ':' + _user.passwordHash + ':' + config.ServerConfig.sessionSecret).digest('hex')) {
                            return next();
                        }
                    } else {

                        return next();
                    }

                    user = _user;

                    scope = config.ServerConfig.oauth.scope.dashboard[user.role] || [];

                    if (user.hasQARights) {
                        scope.push.apply(scope, config.ServerConfig.oauth.scope.dashboard.qa);
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (!user && !customer) {
                    return next({success: false, message: 'User not found'});
                }

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

                var where = user ? {userId: user.userId, customerId: null} : {userId: null, customerId: customer.customerId};

                where.isRevoked = false;
                where.scope = params.scope;
                where.ext = ext;

                if (params.originalCustomerId) {
                    where.originalCustomerId = params.originalCustomerId;
                }

                where.expireDTS = accessTokenExpire ? {
                    [sequelize.gt]: (new moment()).add(1, 'days').toDate()
                } : null;

                return AccessTokens.find({
                    where: where
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
                    userId: user ? user.userId : null,
                    customerId: customer ? customer.customerId : null,
                    originalCustomerId: params.originalCustomerId || null,
                    string: randomString(20),
                    ext: ext
                }, config.CustomerConfig.secret, {
                    expiresIn: accessTokenExpire
                });

                return AccessTokens.create({
                    token: token,
                    userId: user ? user.userId : null,
                    customerId: customer ? customer.customerId : null,
                    scope: params.scope,
                    expireDTS: accessTokenExpire ? (new moment()).add(accessTokenExpire, 'seconds') : null,
                    ext: ext,
                    originalCustomerId: params.originalCustomerId || null
                }).then(function () {

                    return next();
                }).catch(function (err) {

                    return next({success: false, db: err});
                });
            },
            function (next) {

                if (!customer) {
                    return next();
                }

                var d = {};

                if (customer.firstName) {
                    d.first_name = customer.firstName;
                }

                if (customer.lastName) {
                    d.last_name = customer.lastName;
                }

                if (customer.email) {
                    d.email = customer.email;
                }

                if (Object.keys(d).length) {

                    microservice.act({
                        role: 'track',
                        cmd: 'profile',
                        primaryId: customer.customerId,
                        data: d
                    });
                }

                microservice.act({
                    role: 'track',
                    cmd: 'event',
                    primaryId: customer.customerId,
                    event: 'customer_login',
                    data: d
                });

                return next();
            }
        ], function (err) {

            AuditService.addService({
                userId: null,
                customerId: null,
                service: 'auth',
                method: 'oauthCreateToken',
                step: 'finish',
                meta: params,
                token: token
            });

            if (err) {

                logger.error('cardUpsert', err);

                if (err.db) {
                    return db.debugError(callback, err.db);
                }

                return callback(err);
            }

            return callback({
                success: true,
                token: token,
                customerId: customer ? customer.customerId : null,
                userId: user ? user.userId : null,
                redirect_uri: params.redirect_uri,
                login: (customer ? customer.email : null) || (user ? user.login : null),
                firstName: (customer ? customer.firstName : null) || (user ? user.firstName : null),
                lastName: (customer ? customer.lastName : null) || (user ? user.lastName : null),
                state: params.state
            });
        });
    }
};

module.exports = AuthService;
