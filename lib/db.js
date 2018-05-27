'use strict';

/* global config, logger */

var Sequelize = require('sequelize');

module.exports = {
    sequelize: function () {

        if (global.sequelizeInstance) {
            return global.sequelizeInstance;
        }

        global.sequelizeInstance = new Sequelize(config.database.db, config.database.user, config.database.password, {
            dialect: config.database.dialect,
            host: config.database.host,
            port: config.database.port,
            logging: config.database.loggingToConsole ? console.log : false,
            operatorsAliases: false,
            pool: {
                max: 20,
                min: 5,
                idle: 3600000,
                acquire: 20000
            }
        });

        global.sequelizeInstance.authenticate().then(function () {

            logger.info('mysql connected to ' + config.database.host + ':' + config.database.port + '/' + config.database.db);
        }).catch(function () {

            logger.info('mysql connection error ' + config.database.host + ':' + config.database.port + '/' + config.database.db);
        });

        return global.sequelizeInstance;
    }
};