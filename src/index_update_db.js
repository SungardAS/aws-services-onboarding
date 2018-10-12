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
          return roleDataResp.dataValues.id;
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

function createCriteriaEntryForDrAdmin(awsAccountId, drAdminRoleId, mcawsDbObj) {
  return new Promise((resolve, reject) => {
    let data = {};
    const accountWhereClause = { 'name': 'AwsAccount' };
    const assignedAwsAccountWhereClause = { 'name': 'AssignedAwsAccount' };
    const assignedAwsIamRoleWhereClause = { 'name': 'AssignedAwsIamRole' };
    const actionClause = 'read';

    mcawsDbObj.Model(modelObj => {
      modelObj.sync().then(() =>
        modelObj.findOne({ attributes: ['id'], where: accountWhereClause }))
        .then(AwsAccountId =>
          data.AwsAccount = AwsAccountId.dataValues.id
        ).then(() =>
          modelObj.findOne({ attributes: ['id'], where: assignedAwsAccountWhereClause })
        ).then(AssignedAwsAccountId => {
          data.AssignedAwsAccount = AssignedAwsAccountId.dataValues.id;
          return modelObj.findOne({ attributes: ['id'], where: assignedAwsIamRoleWhereClause });
        }).then(AssignedAwsIamRoleId => {
          data.AssignedAwsIamRole = AssignedAwsIamRoleId.dataValues.id;
          mcawsDbObj.Permission(permissionObj => {
            permissionObj.sync().then(() =>
              permissionObj.findOne({ attributes: ['id'], where: { role: drAdminRoleId, model: data.AwsAccount, action: actionClause } })
            ).then(permissionAwsAccountRead => {
              data.permissionAwsAccountRead = permissionAwsAccountRead.dataValues.id;
              return permissionObj.findOne({ attributes: ['id'], where: { role: drAdminRoleId, model: data.AssignedAwsIamRole, action: actionClause } });
            })
              .then(permissionAssignedAwsIamRoleId => {
                data.permissionAssignedAwsIamRoleRead = permissionAssignedAwsIamRoleId.dataValues.id;
                return permissionObj.findOne({ attributes: ['id'], where: { role: drAdminRoleId, model: data.AssignedAwsAccount, action: actionClause } });
              }).then(permissionAssignedAwsAccountRead => {
                data.permissionAssignedAwsAccountRead = permissionAssignedAwsAccountRead.dataValues.id;
                console.log("Before making criteria entry");
                console.log("data", data);
              }).then(() => {
                mcawsDbObj.Criteria(criteriaObj => {
                  criteriaObj.sync().then(() =>
                    criteriaObj.findOrCreate(
                      {
                        where: { where: '{"id":' + awsAccountId + '}', permission: data.permissionAwsAccountRead },
                        defaults: { where: '{"id":' + awsAccountId + '}', permission: data.permissionAwsAccountRead, owner: 0, createdBy: 0 }
                      }
                    ).then(() =>
                      criteriaObj.findOrCreate(
                        {
                          where: { where: '{"account":' + awsAccountId + '}', permission: data.permissionAssignedAwsAccountRead },
                          defaults: { where: '{"account":' + awsAccountId + '}', permission: data.permissionAssignedAwsAccountRead, owner: 0, createdBy: 0 }
                        }
                      )
                    ).then(() =>
                      criteriaObj.findOrCreate(
                        {
                          where: { where: '{"account":{"id":' + awsAccountId + '}}', permission: data.permissionAssignedAwsIamRoleRead },
                          defaults: { where: '{"account":{"id":' + awsAccountId + '}}', permission: data.permissionAssignedAwsIamRoleRead, owner: 0, createdBy: 0 }
                        }
                      )
                      .then(()=>{
                        console.log("After making criteria entry");
                        console.log("Reference data ",data); 
                        resolve(true);
                      }).catch(err => {
                        console.log("Error occured :",err);
                        reject(err);
                      })
                    )
                  );
                });
              });
          });
        });
    });    
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
              let drAdminRoleId = addDradminRole(dbAwsAccount, drAdminRole, accountDetails);
              .then(() => {
                if(drAdminRoleId){
                  console.log("awsAccountId = ",accountDetails.id);
                  console.log("drAdminRoleId = ",drAdminRoleId);
                  createCriteriaEntryForDrAdmin(accountDetails.id, drAdminRoleId, mcawsDbObj);
                  return true;
                }else{
                  console.log("Role `dradmin` not found, hence cannot add the criteria entry");
                  throw new Error("`dradmin` role not found, criteria cannot be added");
                }
              }).then(() => mcawsDbObj.CloseConnection())
              .catch(errAddDrAdmin => {
                console.log(errAddDrAdmin);
                mcawsDbObj.CloseConnection();
              })
            })
          })
        .catch(errAcc => {
          console.log(errAcc);
          mcawsDbObj.CloseConnection();
        })
      );
    });
  });
  callback(null, event);
};
