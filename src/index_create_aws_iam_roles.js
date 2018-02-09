"use strict";

const fs = require('fs');
const uuid = require('node-uuid');
const awsIamRole = require('./lib/awsIamRole.js');

exports.handler = function(event, context, callback) {
  console.log(event);
  console.log(JSON.stringify(event));
  const options = {
    accessKeyId: event.credentials.Credentials.AccessKeyId,
    secretAccessKey: event.credentials.Credentials.SecretAccessKey,
    sessionToken: event.credentials.Credentials.SessionToken
  };
  const type = event.account.billingDetails.type;
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

  if (event.account.billingDetails && event.account.billingDetails.type) {
    options.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${event
      .account.billingDetails.masterAWSMgmAccount}:role/federate`;
    const dbIamRoles = [];
    const roles = awsroles.roles[type.toLowerCase()];
    // var dbAwsAccount = {accountId:options.account,accountName:event.account.billingDetails.name,accountDescription:event.account.billingDetails.desc,email:event.account.billingDetails.email,guid:event.account.billingDetails.guid,accountType:event.account.billingDetails.type};
    for (let i = 0; i < roles.length; i++) {
      let payload = {};
      Object.assign(payload, options, roles[i]);
      payload.externalId = uuid.v4();
      payload = JSON.parse(JSON.stringify(payload));
      if (payload.roleName == 'DatadogAWSIntegrationRole') {
        payload.PolicyDocument = dataDogPolicyDoc;
        payload.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${event
          .account.billingDetails.datadogAwsId}:root`;
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
    // event.dbAwsAccount = dbAwsAccount;
  } else {
    console.log('invalid account type');
    console.log(type);
  }
  callback(null, event);
};
