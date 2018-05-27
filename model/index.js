'use strict';

/* global __dirname, config */

var db = require('../lib/db');
var sequelize = db.sequelize();
var fs = require('fs');
var path = require('path');
var db = {};

fs
        .readdirSync(__dirname)
        .filter(function (file) {

            return (file.indexOf('.') !== 0) && (file !== 'index.js') && (file.slice(-3) === '.js');
        })
        .forEach(function (file) {

            var model = sequelize.import(path.join(__dirname, file));

            db[model.name] = model;
        });

Object.keys(db).forEach(function (modelName) {

    if (db[modelName].hasOwnProperty('associateModel')) {
        db[modelName].associateModel(db);
    }
});

if (config.database.sync) {
    sequelize.sync();
}

module.exports = db;