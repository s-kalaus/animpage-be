'use strict';

module.exports = {
    '/payment': {
        'x-swagger-router-controller': 'payment',
        post: {
            tags: ['payment'],
            description: 'Start subscription payment',
            operationId: 'add',
            parameters: [],
            responses: {
                200: {
                    description: 'Success',
                    schema: {
                        $ref: '#/definitions/ListResponse'
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
                    animpage_auth: ['payment:write']
                }
            ]
        }
    },

    '/payment/subscription': {
        'x-swagger-router-controller': 'payment',
        delete: {
            tags: ['payment'],
            description: 'Cancel subscription',
            operationId: 'remove',
            parameters: [],
            responses: {
                200: {
                    description: 'Success',
                    schema: {
                        $ref: '#/definitions/ListResponse'
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
                    animpage_auth: ['payment:write']
                }
            ]
        }
    }
};