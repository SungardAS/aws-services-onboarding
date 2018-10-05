'use strict';

const Sequelize = require('sequelize');

function getDbOrmObj(user, passwd, host, dbname) {
  const dbObj = new Sequelize(dbname, user, passwd, {
    host:host,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      idle: 30000
    }
  });
  return dbObj;
}

const mcawsModels = function(user, passwd, host, dbname) {
  this.sequelize = getDbOrmObj(user, passwd, host, dbname);
};

mcawsModels.prototype.AwsAccount = function(cb) {
  const AwsAccount = this.sequelize.define(
    'awsaccount',
    {
      name: { type: Sequelize.STRING },
      awsid: { type: Sequelize.STRING },
      description: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING },
      company_guid: { type: Sequelize.STRING },
      account_type: { type: Sequelize.STRING }
    },
    { freezeTableName: true }
  );
  cb(AwsAccount);
};

mcawsModels.prototype.AwsIamRole = function(cb) {
  const AwsIamRole = this.sequelize.define(
    'awsiamrole',
    {
      arn: { type: Sequelize.STRING },
      name: { type: Sequelize.STRING },
      path: { type: Sequelize.STRING },
      externalId: { type: Sequelize.STRING },
      account: { type: Sequelize.INTEGER }
    },
    { freezeTableName: true }
  );
  cb(AwsIamRole);
};

mcawsModels.prototype.Role = function(cb) {
  const Role = this.sequelize.define(
    'role',
    {
      name: { type: Sequelize.STRING },
      active: { type: Sequelize.INTEGER },
      createdBy: { type: Sequelize.INTEGER },
      owner: { type: Sequelize.INTEGER }
    },
    { freezeTableName: true }
  );
  cb(Role);
};

mcawsModels.prototype.AwsAccountAdminRolesRoleAdminAwsAccounts = function(cb) {
  const AwsAccountAdminRolesRoleAdminAwsAccounts = this.sequelize.define(
    'awsaccount_adminroles__role_adminawsaccounts',
    {
      awsaccount_adminroles: { type: Sequelize.INTEGER },
      role_adminawsaccounts: { type: Sequelize.INTEGER },
      createdBy: { type: Sequelize.INTEGER },
      owner: { type: Sequelize.INTEGER }
    },
    { freezeTableName: true }
  );
  cb(AwsAccountAdminRolesRoleAdminAwsAccounts);
};

mcawsModels.prototype.AwsIamRoleRolesRoleAwsIamRoles = function(cb) {
  const AwsIamRoleRolesRoleAwsIamRoles = this.sequelize.define(
    'awsiamrole_roles__role_awsiamroles',
    {
      awsiamrole_roles: { type: Sequelize.INTEGER },
      role_awsiamroles: { type: Sequelize.INTEGER },
      createdBy: { type: Sequelize.INTEGER },
      owner: { type: Sequelize.INTEGER }
    },
    { freezeTableName: true }
  );
  cb(AwsIamRoleRolesRoleAwsIamRoles);
};

mcawsModels.prototype.CloseConnection = function() {
  this.sequelize.close();
}

module.exports = mcawsModels;
