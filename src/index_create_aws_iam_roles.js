'use strict';

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
  options.onboardAccount = true;
  options.path = awsroles.adminRolePath;
  let aws_account_type = event.account.billingDetails.type.toLowerCase();
  options.assumeRolePolicyDocument = (aws_account_type == 'craws'
                                       ? awsroles.crawsAssumeRolePolicyDocument
                                       : awsroles.assumeRolePolicyDocument)

  if (event.account && event.account.billingDetails) {
    const accountData = event.account.billingDetails;
    options.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${process
      .env.MASTER_MGM_AWS_ID}:role/federate`;
    const dbIamRoles = [];

    const roles = awsroles.roles[aws_account_type];
    if (aws_account_type == 'managed')
      roles.push({
        roleName: process.env.ADMIN_ROLE_NAME,
        policyArn: awsroles.adminPolicyArn,
        federate: true
      });

    const dbAwsAccount = {
      awsid: options.account,
      name: accountData.name,
      description: accountData.desc,
      email: accountData.email,
      company_guid: accountData.guid,
      account_type: accountData.type
    };
    if (aws_account_type == 'craws') {
      console.log('Creating roles for CRAWS account');
    }
    for (let i = 0; i < roles.length; i++) {
      let payload = {};
      Object.assign(payload, options, roles[i]);
      payload.externalId = (aws_account_type != 'craws'
                             ? uuid.v4()
                             : null);
      payload = JSON.parse(JSON.stringify(payload));
      if (payload.roleName == 'DatadogAWSIntegrationRole') {
        payload.PolicyDocument = dataDogPolicyDoc;
        payload.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${process
          .env.DATADOG_AWD_ID}:root`;
      }
      if (payload.federate) {
        dbIamRoles.push({
          externalId: payload.externalId,
          path: payload.path,
          name: payload.roleName,
          arn: `arn:aws:iam::${payload.account}:role/${payload.roleName}`
        });
      }
      awsIamRole.createRole(payload, (err, data) => {
        console.log('Error:', err);
        console.log('Res:', data);
      });
    }
  }
  event.dbIamRoles = dbIamRoles;
  event.dbAwsAccount = dbAwsAccount;
  callback(null, event);
};
