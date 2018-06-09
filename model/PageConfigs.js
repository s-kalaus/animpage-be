'use strict';

module.exports = function (sequelize, DataTypes) {

    var PageConfigs = sequelize.define('PageConfigs', {
        pageConfigId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        pageId: {
            type: DataTypes.STRING,
            allowNull: false
        },
        sync: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        inEffect: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        outEffect: {
            type: DataTypes.STRING,
            defaultValue: null
        },
        inDuration: {
            type: DataTypes.INTEGER,
            defaultValue: 800
        },
        outDuration: {
            type: DataTypes.INTEGER,
            defaultValue: 800
        }
    });

    PageConfigs.associateModel = function (models) {

        PageConfigs.belongsTo(models.ShopAccounts, {
            foreignKey: 'shopAccountId'
        });
    };

    return PageConfigs;
};