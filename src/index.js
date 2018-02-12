'use strict';

const fs = require('fs');
const mysql = require('mysql');
const AWS = require('aws-sdk');

const baseHandler = require('aws-services-lib/lambda/base_handler.js');

exports.handler = (event, context) => {
  baseHandler.handler(event, context);
};

baseHandler.get = function(params, callback) {
  const stepfunctions = new AWS.StepFunctions({
    region: process.env.AWS_DEFAULT_REGION
  });
  const input = {
    executionArn: params.executionArn
  };
  stepfunctions.describeExecution(input, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    } else {
      console.log(data);
      // {"executionArn":"arn:aws:states:us-east-1:1111:execution:machine_name:12345678-1234-1234-1234-123456789012",
      //  "stateMachineArn":"arn:aws:states:us-east-1:1111:stateMachine:machine_name",
      //  "name":"12345678-1234-1234-1234-123456789012",
      //  "status":"SUCCEEDED",
      //  "startDate":"2017-02-12T02:12:07.464Z",
      //  "stopDate":"2017-02-12T02:12:45.911Z",
      //  "input":"{\"federation\":{\"roles\":[{\"roleArn\":\"arn:aws:iam::089476....."}",
      //  "output":"{\"results\":{\"cloudtrail\":[{\"result\":true,\"....-west-2\"}]}}"}
      callback(null, data);
    }
  });
};

baseHandler.post = function(params, callback) {
  const stepfunctions = new AWS.StepFunctions({
    region: process.env.AWS_DEFAULT_REGION
  });

  const inputDoc = JSON.parse(
    fs.readFileSync(`${__dirname}/json/state_machine_input.json`, {
      encoding: 'utf8'
    })
  );
  const default_configrules = JSON.parse(
    fs.readFileSync(`${__dirname}/json/default_config_rules.json`, {
      encoding: 'utf8'
    })
  );

  console.log(default_configrules);

  // inputDoc.billing_master.roles = params.roles_to_federate_to_billing_master;
  const masterBillingRoleArn = `arn:aws:iam::${params.masterBillingAWSAccount}:role/${process
    .env.ADMIN_ROLE_NAME}`;

  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({ region: process.env.KMS_REGION });
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      return callback(err);
    }
    console.log('Decrypt password:', password);
    const con = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER_NAME,
      password: passwd,
      database: 'msaws'
    });
    con.connect(err => {
      if (err) throw err;
      console.log('Connected!');
      const sql = `select * from awsiamrole where arn="${masterBillingRoleArn}"`;
      con.query(sql, (err, data) => {
        if (err) throw err;
        console.log(`Result: ${data}`);
        inputDoc.billing_master.roles = [
          {
            roleArn: `arn:aws:iam::${process.env
              .MASTER_MGM_AWS_ID}:role/federate`
          },
          { roleArn: masterBillingRoleArn, externalId: data[0].externalId }
        ];
      });
    });
    if (con) con.end();
  });
  // inputDoc.account.billingDetails = params.account;
  const account = {
    id: params.account,
    name: params.awsname,
    desc: params.awsdesc,
    email: params.email,
    type: params.account_type.toLowerCase(),
    masterAwsId: params.masterBillingAWSAccount,
    OfferingNum: params.offeringNum,
    SGID: params.sgid,
    guid: params.companyguid
  };
  inputDoc.account.billingDetails = account;

  // if (params.account.id) {
  if (account.id) {
    inputDoc.account.httpMethod = 'GET';
    // inputDoc.account.queryStringParameters.accountId = params.account.id;
    inputDoc.account.queryStringParameters.accountId = account.id;
  } else {
    inputDoc.account.httpMethod = 'POST';

    // inputDoc.account.body = params.account;
    inputDoc.account.body = account;
  }
  inputDoc.federation.authorizer_user_guid = params.userGuid;

  // if(params.account.type.toLowerCase() != 'craws')
  if (account.type.toLowerCase() != 'craws') {
    // inputDoc.configrules.rules = params.default_configrules_to_enable;
    inputDoc.configrules.rules = [];
    inputDoc.configrules.customerAccount = params.account.id;
    // inputDoc.health.cloudformationLambdaExecutionRole = params.cloudformation_lambda_execution_role_name;
    inputDoc.health.cloudformationLambdaExecutionRole =
      process.env.CFN_LAMBDA_EXEC_ROLE;
    // inputDoc.health.codePipelineServiceRole = params.codepipeline_service_role_name;
    inputDoc.health.codePipelineServiceRole =
      process.env.CODE_PIPELINE_SERVICE_ROLE;
    // inputDoc.health.gitHubPersonalAccessToken = params.gitHub_personal_access_token;
    inputDoc.health.gitHubPersonalAccessToken =
      process.env.GIT_HUB_ACCESS_TOKEN;
    // inputDoc.health.subscriptionFilterDestinationArn = params.subscription_filter_destination_arn;
    inputDoc.health.subscriptionFilterDestinationArn =
      process.env.SUBSC_FILTER_DEST;
    const inputStateMach = {
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(inputDoc)
    };
  } else {
    const inputStateMach = {
      stateMachineArn: process.env.STATE_MACHINE_FOR_UNMANAGED_ACCOUNT_ARN,
      input: JSON.stringify(inputDoc)
    };
  }

  console.log('======INPUT=====');
  console.log(inputStateMach);
  // if (params.execution_name) input.name = params.execution_name;
  inputStateMach.name = `New-Account-Setup-For-${params.awsname.replace(
    / /g,
    '-'
  )}`;
  stepfunctions.startExecution(inputStateMach, (err, data) => {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    } else {
      console.log(data);
      // {"executionArn":"arn:aws:states:us-east-1:1234:execution:machine_name:12345678-1234-1234-1234-123456789012",
      //  "startDate":"2017-02-12T02:12:07.464Z"}
      callback(null, data);
    }
  });
};
