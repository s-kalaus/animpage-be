'use strict';

/* global config */

const db = require('../lib/db');
const sequelize = db.sequelize();
const async = require('async');
const PageConfigs = require('../model').PageConfigs;
const ShopAccounts = require('../model').ShopAccounts;

var logger = require('../lib/logger')({
    prefix: 'asset'
});

var AssetService = {

    getConfigs: (params, callback) => {

        const uid = params.uid || null;
        const referer = params.referer || '';
        const PageService = require('./page.service');

        let shopAccount = null;
        let pageConfig = Object.assign({}, PageService.pageConfig);

        delete pageConfig.sync;

        const or = ['all'];
        let found = null;

        if (referer.match(/http(s|)\:\/\/[^\/]+(|\/)$/i)) {
            or.push('home');
        } else if (referer.match(/\/cart(\/|$)/i)) {
            or.push('cart');
        } else if (referer.match(/\/account\/register/i)) {
            or.push('register');
        } else if (referer.match(/\/account\/login/i)) {
            or.push('login');
        } else if (referer.match(/\/collections\//i)) {
            or.push('collection');
        } else if (referer.match(/\/products\//i)) {
            or.push('product');
        } else if (referer.match(/\/search\?/i)) {
            or.push('search');
        } else if ((found = referer.match(/\/pages\/([^\/$]+)/i))) {
            or.push('page');
            or.push('page.' + found[1]);
        } else if ((found = referer.match(/\/blogs\/([^\/$]+)/i))) {
            or.push('blog');
            or.push('blog.' + found[1]);
        }

        return async.series([
            (next) => {

                return ShopAccounts.find({
                    where: {
                        uid: uid,
                        token: {
                            [sequelize.Op.ne]: null
                        }
                    }
                }).then(function (_shopAccount) {

                    if (!_shopAccount) {
                        return next({success: false, code: 404, message: 'Shop Not Found'});
                    }

                    shopAccount = _shopAccount;

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                return PageConfigs.find({
                    where: {
                        shopAccountId: shopAccount.shopAccountId,
                        pageId: or
                    },
                    order: [[sequelize.fn('Length', sequelize.col('pageId')), 'desc']]
                }).then(function (_pageConfig) {

                    if (_pageConfig) {

                        pageConfig = {
                            inEffect: _pageConfig.inEffect,
                            outEffect: _pageConfig.outEffect,
                            inDuration: _pageConfig.inDuration,
                            outDuration: _pageConfig.outDuration
                        };
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            }
        ], (err) => {

            if (err) {

                logger.error('getConfigs', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: pageConfig
            });
        });
    }
};

module.exports = AssetService;
