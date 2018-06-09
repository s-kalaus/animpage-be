'use strict';

/* global config */

var _ = require('lodash');
var urlParser = require('url');

module.exports = function () {

    return {
        swagger: '2.0',
        info: {
            version: '1.0.0',
            title: 'Animpage API'
        },
        host: urlParser.parse(config.url).host,
        basePath: '/v1',
        schemes: [
            'https'
        ],
        consumes: [
            'application/json',
            'application/x-www-form-urlencoded'
        ],
        produces: [
            'application/json'
        ],
        securityDefinitions: {
            animpage_auth: {
                type: 'oauth2',
                authorizationUrl: config.url + '/v1/oauth',
                flow: 'implicit',
                scopes: {
                    'page:read': 'Read page',
                    'page:write': 'Write page',
                    'payment:write': 'Write payment'
                }
            }
        },
        tags: [
            {name: 'auth'},
            {name: 'page'},
            {name: 'asset'},
            {name: 'payment'}
        ],
        paths: _.extend({},
            require('./schemas/auth'),
            require('./schemas/page'),
            require('./schemas/asset'),
            require('./schemas/payment')
        ),
        definitions: {
            ErrorResponse: {
                required: [
                    'success',
                    'message'
                ],
                properties: {
                    success: {
                        type: 'boolean'
                    },
                    code: {
                        type: 'string'
                    },
                    message: {
                        type: 'string'
                    }
                }
            },
            SuccessResponse: {
                required: [
                    'success'
                ],
                properties: {
                    success: {
                        type: 'boolean'
                    }
                }
            },
            ListResponse: {
                required: [
                    'success',
                    'data'
                ],
                properties: {
                    success: {
                        type: 'boolean'
                    },
                    data: {
                        type: 'array',
                        items: {
                            type: 'object'
                        }
                    }
                }
            }
        }
    };
};
