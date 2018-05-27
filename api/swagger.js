'use strict';

/* global config */

var _ = require('lodash');
var urlParser = require('url');

module.exports = function () {

    return {
        swagger: '2.0',
        info: {
            version: '1.0.0',
            title: 'Pixc API'
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
        ]/*,
        securityDefinitions: {
            pixc_auth: {
                type: 'oauth2',
                authorizationUrl: config.url + '/v1/oauth',
                flow: 'implicit',
                scopes: {
                    'mails:send': 'Send email'
                }
            }
        }*/,
        tags: [
            {name: 'auth'}
        ],
        paths: _.extend({},
            require('./schemas/auth')
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
            }/*,
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
            }*/
        }
    };
};
