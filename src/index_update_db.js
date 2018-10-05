'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');
let mcawsDbObj = null;

function addDradminRole(dbAwsAccount, dradminRole,
                        accountDetails, fullAdminRoleName) {
  return new Promise((resolve, reject) => {
    if(dbAwsAccount.account_type.toLowerCase() != 'craws') {
      console.log("Account type is not craws. Hence skipping.");
      resolve(true);
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
            reject("dradmin role name error");
          }
        })
        .then(roleDataResp => {
          mcawsDbObj.AwsAccountAdminRolesRoleAdminAwsAccounts(accountRole =>
            accountRole.findOne({
              where: {
                awsaccount_adminroles: accountDetails.id,
                role_adminawsaccounts: roleDataResp.dataValues.id
              }
            })
            .then(accountRoleResp => {
              if(accountRoleResp) {
                console.log("Role already added to awsaccount");
                return accountRoleResp;
              } else return accountRole.create({
                awsaccount_adminroles: accountDetails.id,
                role_adminawsaccounts: roleDataResp.dataValues.id
              })
            })
            .then(accountRoleData => {
              console.log("Role added to awsaccount");
              console.log(accountRoleData);
            })
          );
          mcawsDbObj.AwsIamRole(iamRole =>
            iamRole.findOne({
              where: {
                account: accountDetails.id,
                name: fullAdminRoleName
              }
            })
            .then(iamRoleResp => {
              if(iamRoleResp) {
                return iamRoleResp;
              } else {
                console.log("Target role does not exists");
                reject("Target role does not exists");
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
                  resolve(true);
                })
              )
            )
          );
        })
      });
    }
  })
}

function createIamRole(dbIamRole) {
  return new Promise((resolve, reject) => {
    mcawsDbObj.AwsIamRole(iamResp =>
        iamResp.findOne({
           where: {arn: dbIamRole.arn}
        })
        .then(resultData =>{
          if(resultData) {
             console.log("IAM Role entry is already there.");
             return resultData;
          }
          else return iamResp.create(dbIamRole);
        })
        .then(roleData => {
          console.log('role updation Done :)');
          console.log(roleData);
          resolve(roleData);
        })
        .catch(errRole => {
          console.log(errRole);
          reject(errRole);
        })
      );
  });
}

function createIamRoles(dbIamRoles, accData, mcawsDbObj) {
  return new Promise((resolve, reject) => {

    for (let idx = 0; idx < dbIamRoles.length; idx++) {
      dbIamRoles[idx].account = accData.dataValues.id;
    }
    Promise.all(dbIamRoles.map(createIamRole)).then(function(results){
      console.log("Roles creation completed");
      resolve(true);
    })
  });
}

exports.handler = function(event, context, callback) {
  const dbIamRoles = event.dbIamRoles;
  const dbAwsAccount = event.dbAwsAccount;
  const fullAdminRoleName = 'FullAdmin';
  const dradminRole = event.dradminRole;
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({ region: process.env.KMS_REGION });
  let accountDetails = null;
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      callback(err);
      return;
    }
    mcawsDbObj = new McawsModels(
      process.env.DB_USERNAME,
      passwd.Plaintext.toString('ascii'),
      process.env.DB_HOST,
      'msaws'
    );

    mcawsDbObj.AwsAccount(accountResp => {
      accountResp.sync().then(() =>
        accountResp.findOne({
             where: dbAwsAccount
        }).then(accountData =>{
             if(accountData) {
               console.log("Account entry is already there.");
                return accountData;
             }
             else return accountResp.create(dbAwsAccount);
         })
          .then(accData => {
            accountDetails = JSON.parse(JSON.stringify(accData));
            createIamRoles(dbIamRoles, accData, mcawsDbObj)
            .then(() => {
              addDradminRole(dbAwsAccount, dradminRole,
                             accountDetails, fullAdminRoleName)
              .then(() => mcawsDbObj.CloseConnection())
            })
          })
        .catch(errAcc => console.log(errAcc))
      );
    });
  });
  callback(null, event);
};
