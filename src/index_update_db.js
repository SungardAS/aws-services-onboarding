'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');
const fullAdminRoleName = 'FullAdmin';
let mcawsDbObj = null;

function addDradminRole(dbAwsAccount, drAdminRole, accountDetails) {
  return new Promise((resolve, reject) => {
    if(dbAwsAccount.account_type.toLowerCase() != 'craws') {
      console.log("Account type is not craws. Hence skipping.");
      resolve(true);
    } else {
      mcawsDbObj.Role(roleResp => {
        roleResp.findOne({
          where: drAdminRole
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
                console.log("IAM role does not exists");
                reject("IAM role does not exists");
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
                    console.log("dradmin role already added to iam roles");
                    return iamRoleRoleResp;
                  } else return iamRoleRole.create({
                    awsiamrole_roles: iamRoleData.dataValues.id,
                    role_awsiamroles: roleDataResp.dataValues.id
                  })
                })
                .then(iamRoleRoleData => {
                  console.log("dradmin role added to iam role")
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
      console.log("IAM roles creation completed");
      resolve(true);
    })
  });
}

exports.handler = function(event, context, callback) {
  const dbIamRoles = event.dbIamRoles;
  const dbAwsAccount = event.dbAwsAccount;
  const drAdminRole = event.drAdminRole;
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
              addDradminRole(dbAwsAccount, drAdminRole, accountDetails)
              .then(() => mcawsDbObj.CloseConnection())
              .catch(errAddDrAdmin => {
                console.log(errAddDrAdmin);
                mcawsDbObj.CloseConnection();
              })
            })
          })
        .catch(errAcc => {
          console.log(errAcc);
          mcawsDbObj.CloseConnection()
        })
      );
    });
  });
  callback(null, event);
};
