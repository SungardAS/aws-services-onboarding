'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');

exports.handler = function(event, context, callback) {
  const dbAwsAccount = event.dbAwsAccount;
  const dradminRole = event.dradminRole;
  const fullAdminRoleName = 'FullAdmin';
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({ region: process.env.KMS_REGION });

  if(dbAwsAccount.account_type.toLowerCase() != 'craws') {
    console.log("Account type is not craws. Hence skipping.");
    callback(null, event);
  }
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      callback(err);
      return;
    }
    const mcawsDbObj = new McawsModels(
      process.env.DB_USERNAME,
      passwd.Plaintext.toString('ascii'),
      process.env.DB_HOST,
      'msaws'
    );
    mcawsDbObj.Role(roleResp => {
      roleResp.sync().then(() =>
        roleResp.findOne({
          where: dradminRole
        }).then(roleData => {
          if(roleData) {
            return roleData;
          } else {
            console.log("dradmin role name provided does not exists");
            throw new Error("dradmin role name error");
          }
        }).then(roleDataResp => {
          mcawsDbObj.AwsAccount(accResp => {
            accResp.sync().then(() =>
              accResp.findOne({
                where: dbAwsAccount
              }).then(accountData => {
                if(accountData) {
                  console.log("Account entry is there.");
                  return accountData;
                } else {
                  console.log("Account entry is not there.");
                  throw new Error("Account entry missing");
                }
              }).then(accData => {
                mcawsDbObj.AwsAccountAdminRolesRoleAdminAwsAccounts(accRole => {
                  accRole.findOne({
                    where: {
                      awsaccount_adminroles: accData.id,
                      role_adminawsaccounts: roleDataResp.id
                    }
                  }).then(accRoleResp => {
                    if(accRoleResp) {
                      console.log("Role already added to awsaccount");
                      return accRoleResp;
                    } else return accRoleResp.create({
                      awsaccount_adminroles: accData.id,
                      role_adminawsaccounts: roleDataResp.id
                    });
                  }).then(accRoleData => {
                    console.log("Role added to awsaccount");
                    console.log(accRoleData);
                    return accRoleData;
                  }).then(accRoleDataResp => {
                    mcawsDbObj.AwsIamRole(iamResp => {
                      iamResp.findOne({
                        where: {
                          account: accData.id,
                          name: fullAdminRoleName
                        }
                      }).then(iamData => {
                        if(iamData) {
                          console.log("IAM role exists");
                          return iamData;
                        } else {
                          console.log("IAM role is missing");
                          throw new Error("IAM role is missing");
                        }
                      }).then(iamDataResp => {
                        mcawsDbObj.AwsIamRoleRolesRoleAwsIamRoles(rolIamRol => {
                          rolIamRol.findOne({
                            where: {
                              awsiamrole_roles: iamDataResp.id,
                              role_awsiamroles: roleDataResp.id
                            }
                          }).then(rolIamRolResp => {
                            if(rolIamRolResp) {
                              console.log("Role already added to IAM role");
                              return rolIamRolResp;
                            } else return rolIamRolResp.create({
                              awsiamrole_roles: iamDataResp.id,
                              role_awsiamroles: roleDataResp.id
                            });
                          }).then(rolIamRolData => {
                            console.log("Role added to IAM role");
                            console.log(rolIamRolData);
                          })
                          .catch(err => console.log(err))
                          .finally(() => mcawsDbObj.CloseConnection())
                        });
                      });
                    });
                  });
                });
              });
            );
          });
        });
      );
    });
  });
  callback(null, event);
};
