'use strict';

/* global config */

const _ = require('lodash');
const qs = require('querystring');
const SwaggerExpress = require('swagger-express-mw');

require('../lib/common')();

const httpservice = require('../lib/http');
const AuthService = require('../service/auth.service');

var logger = require('../lib/logger')({
    prefix: 'api'
});

httpservice.init({}, function (err, done) {

    if (err) {
        return logger.error('httpservice/api error', err);
    }

    var self = this;

    var swaggerConfig = {
        appRoot: '.',
        swagger: require('../api/swagger')(),
        swaggerControllerPipe: 'swagger_controllers',
        bagpipes: {
            _router: {
                name: 'swagger_router',
                mockMode: false,
                mockControllersDirs: ['api/mocks'],
                controllersDirs: ['api/controllers']
            },
            _swagger_validate: {
                name: 'swagger_validator',
                validateReponse: true
            },
            swagger_controllers: [
                {
                    onError: 'error_handler'
                },
                'cors',
                'swagger_security',
                '_swagger_validate',
                'express_compatibility',
                '_router'
            ]
        },
        swaggerSecurityHandlers: {
            pixc_auth: function (req, authOrSecDef, scopesOrApiKey, callback) {

                return AuthService.oauthAuthorize({
                    req: req,
                    scope: scopesOrApiKey
                }, function (result) {

                    if (!result || !result.success) {
                        return callback({success: false, message: result && result.message ? result.message : 'Unknown error'});
                    }

                    return callback();
                });
            }
        }
    };

    SwaggerExpress.create(swaggerConfig, function (err, swaggerExpress) {

        if (err) {
            throw err;
        }

        swaggerExpress.register(self.app);
    });

    this.app.get('/v1/schema', function (req, res) {

        return res.json(_.clone(require('../api/swagger-api')()));
    });

    this.app.get('/docs', function (req, res) {

        return res.render('swagger', {
            url: config.url
        });
    });

    this.app.get('/docs/o2c', function (req, res) {

        return res.render('o2c');
    });

    this.app.get('/docs/api', function (req, res) {

        var schema = _.clone(require('../api/swagger')());

        for (var k in schema.paths) {

            if (k.match(/\/api\//i)) {
                delete schema.paths[k];
            }
        }

        return res.json(schema);
    });

    this.app.get('/v1/oauth', function (req, res) {

        req.query.url = '/v1/oauth?' + qs.stringify(req.query);

        return res.render('oauth', req.query);
    });

    this.app.post('/v1/oauth', function (req, res) {

        return AuthService.oauthCreateToken(req.body, function (result) {

            if (!result || !result.success) {

                req.body.error = result && result.message ? result.message : 'Unhandled error';
                req.body.url = '/v1/oauth?' + qs.stringify(req.body);

                return res.render('oauth', req.body);
            }

            return res.redirect(result.redirect_uri + '?access_token=' + result.token + '&state=' + result.state);
        });
    });

    return done.call(this);
}, function () {

    this.add({
        group: 'api'
    });
});
