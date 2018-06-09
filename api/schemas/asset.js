'use strict';

module.exports = {
    '/asset/{uid}.{type}': {
        'x-swagger-router-controller': 'asset',
        get: {
            tags: ['asset'],
            description: 'Get asset',
            operationId: 'show',
            parameters: [
                {
                    name: 'uid',
                    'in': 'path',
                    description: 'Shop name',
                    type: 'string',
                    required: true
                },
                {
                    name: 'type',
                    'in': 'path',
                    description: 'Shop name',
                    type: 'string',
                    enum: ['js', 'css'],
                    required: true
                },
                {
                    name: 'referer',
                    'in': 'query',
                    description: 'Referer',
                    type: 'string',
                    required: false
                }
            ],
            responses: {
                200: {
                    description: 'File content'
                },
                404: {
                    description: 'Not Found'
                },
                500: {
                    description: 'App Error'
                }
            }
        }
    }
};