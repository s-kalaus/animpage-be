'use strict';

/* global config */

const async = require('async');
const shopifyAPI = require('shopify-node-api');
const PageConfigs = require('../model').PageConfigs;

var logger = require('../lib/logger')({
    prefix: 'page'
});

var PageService = {

    pageConfig: {
        sync: false,
        inEffect: null,
        outEffect: null,
        inDuration: 800,
        outDuration: 400
    },

    list: (params, callback) => {

        const token = params.token || null;
        const uid = params.uid || null;
        const customerId = params.customerId || null;

        let list = [
            {
                pageId: 'all',
                title: 'All Website'
            },
            {
                pageId: 'home',
                title: 'Homepage'
            },
            {
                pageId: 'collection',
                title: 'All Collections'
            },
            {
                pageId: 'product',
                title: 'All Products'
            },
            {
                pageId: 'page',
                title: 'All Pages'
            },
            {
                pageId: 'blog',
                title: 'All Blogs'
            },
            {
                pageId: 'cart',
                title: 'Shopping Cart'
            },
            {
                pageId: 'login',
                title: 'Login'
            },
            {
                pageId: 'register',
                title: 'Registration'
            },
            {
                pageId: 'search',
                title: 'Search'
            }
        ];

        const shopify = new shopifyAPI({
            shop: uid,
            access_token: token
        });

        return async.series([
            (next) => {

                return shopify.get('/admin/pages.json', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Shopify Error', original: err});
                    }

                    list = list.concat(data.pages.map((page) => ({ pageId: 'page.' + page.handle, title: 'Page: ' + page.title })));

                    return next();
                });
            },
            (next) => {

                return shopify.get('/admin/blogs.json', (err, data) => {

                    if (err) {
                        return next({success: false, message: 'Shopify Error', original: err});
                    }

                    list = list.concat(data.blogs.map((blog) => ({ pageId: 'blog.' + blog.handle, title: 'Blog: ' + blog.handle })));

                    return next();
                });
            }
        ], (err) => {

            if (err) {

                logger.error('list', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: list
            });
        });
    },

    show: (params, callback) => {

        const shopAccountId = params.shopAccountId || null;
        const pageId = params.pageId || null;

        let pageConfig = PageService.pageConfig;

        return async.series([
            (next) => {

                return PageConfigs.find({
                    where: {
                        shopAccountId: shopAccountId,
                        pageId: pageId
                    }
                }).then(function (_pageConfig) {

                    if (_pageConfig) {
                        pageConfig = _pageConfig;
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            }
        ], (err) => {

            if (err) {

                logger.error('show', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: pageConfig
            });
        });
    },

    save: (params, callback) => {

        const shopAccountId = params.shopAccountId || null;
        const pageId = params.pageId || null;
        const sync = typeof params.sync === 'undefined' ? true : params.sync;
        const inEffect = params.inEffect || null;
        const outEffect = params.outEffect || null;
        const inDuration = params.inDuration || 800;
        const outDuration = params.outDuration || 800;

        let pageConfig = PageService.pageConfig;
        let created = false;

        return async.series([
            (next) => {

                return PageConfigs.findOrCreate({
                    where: {
                        shopAccountId: shopAccountId,
                        pageId: pageId
                    },
                    defaults: {
                        sync,
                        inEffect,
                        outEffect,
                        inDuration,
                        outDuration
                    }
                }).spread(function (_pageConfig, _created) {

                    pageConfig = _pageConfig;
                    created = _created;

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                if (created) {
                    return next();
                }

                return pageConfig.update({
                    sync,
                    inEffect,
                    outEffect,
                    inDuration,
                    outDuration
                }).then(function (_pageConfig) {

                    pageConfig = _pageConfig;

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            }
        ], (err) => {

            if (err) {

                logger.error('save', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: pageConfig
            });
        });
    },

    remove: (params, callback) => {

        const shopAccountId = params.shopAccountId || null;
        const pageId = params.pageId || null;

        let pageConfig = null;

        return async.series([
            (next) => {

                return PageConfigs.find({
                    where: {
                        shopAccountId: shopAccountId,
                        pageId: pageId
                    }
                }).then(function (_pageConfig) {

                    if (_pageConfig) {
                        pageConfig = _pageConfig;
                    }

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            },
            (next) => {

                if (!pageConfig) {
                    return next();
                }

                return pageConfig.destroy().then(function () {

                    return next();
                }).catch(function (err) {

                    return next({success: false, message: 'DB Error', original: err});
                });
            }
        ], (err) => {

            if (err) {

                logger.error('remove', err);

                return callback(err);
            }

            return callback({
                success: true,
                data: PageService.pageConfig
            });
        });
    }
};

module.exports = PageService;
