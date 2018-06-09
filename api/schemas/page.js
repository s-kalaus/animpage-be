'use strict';

module.exports = {
    '/page': {
        'x-swagger-router-controller': 'page',
        get: {
            tags: ['page'],
            description: 'Get list of pages',
            operationId: 'list',
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
                    animpage_auth: ['page:read']
                }
            ]
        }
    },
    '/page/{pageId}': {
        'x-swagger-router-controller': 'page',
        get: {
            tags: ['page'],
            description: 'Get page config',
            operationId: 'show',
            parameters: [
                {
                    name: 'pageId',
                    'in': 'path',
                    description: 'Page ID',
                    type: 'string',
                    required: true
                }
            ],
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
                    animpage_auth: ['page:read']
                }
            ]
        },
        put: {
            tags: ['page'],
            description: 'Save page config',
            operationId: 'save',
            parameters: [
                {
                    name: 'pageId',
                    'in': 'path',
                    description: 'Page ID',
                    type: 'string',
                    required: true
                },
                {
                    name: 'sync',
                    'in': 'formData',
                    description: 'sync',
                    type: 'boolean',
                    required: true
                },
                {
                    name: 'inEffect',
                    'in': 'formData',
                    description: 'inEffect',
                    type: 'string',
                    required: false
                },
                {
                    name: 'outEffect',
                    'in': 'formData',
                    description: 'outEffect',
                    type: 'string',
                    required: false
                },
                {
                    name: 'inDuration',
                    'in': 'formData',
                    description: 'inDuration',
                    type: 'integer',
                    required: true
                },
                {
                    name: 'outDuration',
                    'in': 'formData',
                    description: 'outDuration',
                    type: 'integer',
                    required: true
                }
            ],
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
        },
        delete: {
            tags: ['page'],
            description: 'Remove page config',
            operationId: 'remove',
            parameters: [
                {
                    name: 'pageId',
                    'in': 'path',
                    description: 'Page ID',
                    type: 'string',
                    required: true
                }
            ],
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