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

  if (event.account && event.account.billingDetails) {
    const accountData = event.account.billingDetails;
    const roles = awsroles.roles[accountData.type.toLowerCase()];
    for (let i = 0; i < roles.length; i++) {
      let payload = {};
      Object.assign(payload, options, roles[i]);
      payload.externalId = uuid.v4();
      payload = JSON.parse(JSON.stringify(payload));
      if (payload.roleName == 'DatadogAWSIntegrationRole') {
        payload.PolicyDocument = dataDogPolicyDoc;
        payload.assumeRolePolicyDocument.Statement[0].Principal.AWS = `arn:aws:iam::${process
          .env.DATADOG_AWD_ID}:root`;
      }
      awsIamRole.createRole(payload, (err, data) => {
        console.log('Error:', err);
        console.log('Res:', data);
      });
    }

  }
  callback(null, event);
};
