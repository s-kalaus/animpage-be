'use strict';

module.exports = {
    '/auth': {
        'x-swagger-router-controller': 'auth',
        get: {
            tags: ['auth'],
            description: 'Open app',
            operationId: 'open',
            parameters: [
                {
                    name: 'code',
                    'in': 'query',
                    description: 'Auth code',
                    type: 'string',
                    required: false
                },
                {
                    name: 'hmac',
                    'in': 'query',
                    description: 'HMAC',
                    type: 'string',
                    required: true
                },
                {
                    name: 'shop',
                    'in': 'query',
                    description: 'Shop name',
                    type: 'string',
                    required: true
                },
                {
                    name: 'state',
                    'in': 'query',
                    description: 'State',
                    type: 'string',
                    required: false
                },
                {
                    name: 'timestamp',
                    'in': 'query',
                    description: 'Timestamp',
                    type: 'string',
                    required: true
                }
            ],
            responses: {
                302: {
                    description: 'Redirect to app'
                }
            }
        }
    },
//    '/auth/webhook': {
//        'x-swagger-router-controller': 'auth',
//        post: {
//            tags: ['auth'],
//            description: 'Webhook entry',
//            operationId: 'webhook',
//            parameters: [],
//            responses: {
//                200: {
//                    description: 'Webhook Success'
//                },
//                500: {
//                    description: 'Webhook Error'
//                }
//            }
//        }
//    },
    '/auth/uninstall': {
        'x-swagger-router-controller': 'auth',
        delete: {
            tags: ['auth'],
            description: 'Uninstall app',
            operationId: 'uninstall',
            parameters: [],
            responses: {
                200: {
                    description: 'Success',
                    schema: {
                        $ref: '#/definitions/SuccessResponse'
                    }
                },
                'default': {
                    description: 'Error',
                    schema: {
                        $ref: '#/definitions/ErrorResponse'
                    }
                }
            },
            security: [
                {
                    animpage_auth: ['page:write']
                }
            ]
        }
    }
};