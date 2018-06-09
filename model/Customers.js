'use strict';

module.exports = function (sequelize, DataTypes) {

    var Customers = sequelize.define('Customers', {
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            defaultValue: null
        }
    });

    Customers.associateModel = function (models) {

        Customers.hasMany(models.AccessTokens, {
            foreignKey: 'customerId'
        });
    };

    return Customers;
};