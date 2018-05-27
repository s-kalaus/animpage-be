'use strict';

module.exports = {
    '/auth/register': {
        'x-swagger-router-controller': 'auth',
        post: {
            tags: ['auth'],
            description: 'register new customer',
            operationId: 'register',
            parameters: [
                {
                    name: 'login',
                    'in': 'formData',
                    description: 'Login',
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
            }
        }
    }
};