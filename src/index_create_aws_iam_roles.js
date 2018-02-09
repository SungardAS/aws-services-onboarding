"use strict";

const fs = require('fs');
const uuid = require('node-uuid');
const awsIamRole = require('./lib/awsIamRole.js');

exports.handler = function(event, context, callback) {
  console.log(JSON.stringify(event));
  const options = {
    accessKeyId: event.credentials.Credentials.AccessKeyId,
    secretAccessKey: event.credentials.Credentials.SecretAccessKey,
    sessionToken: event.credentials.Credentials.SessionToken
  };
  const awsroles = JSON.parse(
    fs.readFileSync(`${__dirname}/json/federate-role_info.json`, {
      encoding: 'utf8'
    })
  );
  const dataDogPolicyDoc = JSON.parse(
    fs.readFileSync(`${__dirname}/json/datadog-integration_policy.json`, {
      encoding: 'utf8'
    })
  );

  options.account = event.final_result.account_id;
  options.assumeRolePolicyDocument = awsroles.assumeRolePolicyDocument;
  options.onboardAccount = true;
  options.path = awsroles.adminRolePath;
  

  if (event.account && event.account.billingDetails) {
    const accountData = event.account.billingDetails;
    options.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${process.env.MASTER_MGM_AWS_ID}:role/federate`;
    const dbIamRoles = [];
    
    const roles = awsroles.roles[type];
    if(accountData.type=='managed') roles.push({roleName:process.env.ADMIN_ROLE_NAME,policyArn:awsroles.adminPolicyArn,federate:true});

     var dbAwsAccount = {account:options.account,awsname:accountData.name,desc:accountData.desc,email:accountData.email,guid:accountData.guid,accountType:accountData.type};
    for (let i = 0; i < roles.length; i++) {
      let payload = {};
      Object.assign(payload, options, roles[i]);
      payload.externalId = uuid.v4();
      payload = JSON.parse(JSON.stringify(payload));
      if (payload.roleName == 'DatadogAWSIntegrationRole') {
        payload.PolicyDocument = dataDogPolicyDoc;
        payload.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${process.env.DATADOG_AWD_ID}:root`;
      }
      if (payload.federate) {
        dbIamRoles.push({
          account: payload.account,
          externalId: payload.externalId,
          path: payload.path,
          roleName: payload.roleName
        });
      }
      awsIamRole.createRole(payload, (err, data) => {
        console.log(err);
        console.log(data);
      });
    }
    event.dbIamRoles = dbIamRoles;
    event.dbAwsAccount = dbAwsAccount;
  } else {
    console.log('invalid account type');
    console.log(type);
  }
  callback(null, event);
};
