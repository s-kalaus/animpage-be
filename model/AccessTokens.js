'use strict';

module.exports = function (sequelize, DataTypes) {

    var AccessTokens = sequelize.define('AccessTokens', {
        accessTokenId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING(2048),
            allowNull: false,
            allowEmpty: false
        },
        expireDTS: {
            type: DataTypes.DATE,
            allowNull: true,
            allowEmpty: false
        },
        isRevoked: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            allowEmpty: false,
            defaultValue: false
        },
        scope: {
            type: DataTypes.STRING,
            allowNull: false,
            allowEmpty: false
        },
        ext: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        }
    });

    AccessTokens.associateModel = function (models) {

        AccessTokens.belongsTo(models.Customers, {
            foreignKey: 'customerId'
        });

        AccessTokens.belongsTo(models.ShopAccounts, {
            foreignKey: 'shopAccountId'
        });
    };

    return AccessTokens;
};