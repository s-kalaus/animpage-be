'use strict';

/* global config */

var AssetService = require('../../service/asset.service');
var swaggerUtil = require('../../lib/swagger');

var AssetApi = {

    show: function (req, res) {

        const params = swaggerUtil.formatParams(req);
        const type = params.type || 'js';

        params.referer = params.referer || req.headers.referer;

        return AssetService.getConfigs(params, function (result) {

            if (!result.success) {
                return res.sendStatus(result.code || 500);
            }

            res.header('Content-Type' , type === 'css' ? 'text/css' : 'application/javascript');

            return res.render(type, result.data);
        });
    }
};

module.exports = AssetApi;