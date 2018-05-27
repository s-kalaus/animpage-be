'use strict';

module.exports = function (sequelize, DataTypes) {

    var Customers = sequelize.define('Customers', {
        customerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        }
    });

    return Customers;
};