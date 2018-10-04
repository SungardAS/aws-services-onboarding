'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');

exports.handler = function(event, context, callback) {
  const dbIamRoles = event.dbIamRoles;
  const dbAwsAccount = event.dbAwsAccount;
  const fullAdminRoleName = 'FullAdmin';
  const dradminRole = event.dradminRole;
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({ region: process.env.KMS_REGION });
  let accDetails = null;
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
    mcawsDbObj.AwsAccount(accResp => {
      accResp.sync().then(() =>
        accResp.findOne({
             where: dbAwsAccount
        }).then(accountData =>{
             if(accountData) {
               console.log("Account entry is already there.");
               console.log(accountData);
                return accountData;
             }
             else return accResp.create(dbAwsAccount);
         })
          .then(accData => {
            accDetails = JSON.parse(JSON.stringify(accData));
            console.log(`accDetails: ${JSON.stringify(accDetails)}`);
            console.log(`accData: ${JSON.stringify(accData)}`);
            for (let idx = 0; idx < dbIamRoles.length; idx++) {
              dbIamRoles[idx].account = accData.dataValues.id;
              mcawsDbObj.AwsIamRole(iamResp =>
                iamResp.findOne({
                   where: {arn: dbIamRoles[idx].arn}
                })
                .then(resultData =>{
                  if(resultData) {
                     console.log("IAM Role entry is already there.");
                     return resultData;
                  }
                  else return iamResp.create(dbIamRoles[idx]);
                })
                .then(roleData => {
                  console.log('role updation Done :)');
                  console.log(roleData);
                })
                .catch(errRole => console.log(errRole))
              );
            }
          })
          .then(() => {
            if(dbAwsAccount.account_type.toLowerCase() != 'craws') {
              console.log("Account type is not craws. Hence skipping.");
            } else {
              mcawsDbObj.Role(roleResp => {
                roleResp.findOne({
                  where: dradminRole
                })
                .then(roleData => {
                  if(roleData) {
                    return roleData;
                  } else {
                    console.log("dradmin role name provided does not exists");
                    throw new Error("dradmin role name error");
                  }
                })
                .then(roleDataResp => {
                  mcawsDbObj.AwsAccountAdminRolesRoleAdminAwsAccounts(accRole =>
                    accRole.findOne({
                      where: {
                        awsaccount_adminroles: accDetails.id,
                        role_adminawsaccounts: roleDataResp.dataValues.id
                      }
                    })
                    .then(accRoleResp => {
                      if(accRoleResp) {
                        console.log("Role already added to awsaccount");
                        return accRoleResp;
                      } else return accRole.create({
                        awsaccount_adminroles: accDetails.id,
                        role_adminawsaccounts: roleDataResp.dataValues.id
                      })
                    })
                    .then(accRoleData => {
                      console.log("Role added to awsaccount");
                      console.log(accRoleData);
                    })
                  );
                  mcawsDbObj.AwsIamRole(iamRole =>
                    iamRole.findOne({
                      where: {
                        account: accDetails.id,
                        name: fullAdminRoleName
                      }
                    })
                    .then(iamRoleResp => {
                      if(iamRoleResp) {
                        return iamRoleResp;
                      } else {
                        console.log("Target role does not exists");
                        throw new Error("Target role does not exists");
                      }
                    })
                    .then(iamRoleData =>
                      mcawsDbObj.AwsIamRoleRolesRoleAwsIamRoles(iamRoleRole =>
                        iamRoleRole.findOne({
                          where: {
                            awsiamrole_roles: iamRoleData.dataValues.id,
                            role_awsiamroles: roleDataResp.dataValues.id
                          }
                        })
                        .then(iamRoleRoleResp => {
                          if(iamRoleRoleResp) {
                            console.log("Role already added to iam roles");
                            return iamRoleRoleResp;
                          } else return iamRoleRole.create({
                            awsiamrole_roles: iamRoleData.dataValues.id,
                            role_awsiamroles: roleDataResp.dataValues.id
                          })
                        })
                        .then(iamRoleRoleData => {
                          console.log("Role added to iam role")
                          console.log(iamRoleRoleData);
                        })
                        .then(() => mcawsDbObj.CloseConnection())
                      )
                    )
                  );
                })
              });
            }
          })
        .catch(errAcc => console.log(errAcc))
      );
    });
  });
  callback(null, event);
};
