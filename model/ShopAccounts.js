'use strict';

module.exports = function (sequelize, DataTypes) {

    var ShopAccounts = sequelize.define('ShopAccounts', {
        shopAccountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        uid: {
            type: DataTypes.STRING,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        nonce: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });

    ShopAccounts.associateModel = function (models) {

        ShopAccounts.belongsTo(models.Customers, {
            foreignKey: 'customerId'
        });
    };
    return ShopAccounts;
};