
var fs = require('fs');
var AWS = require('aws-sdk');
//var mysql = require('mysql');
var sleep = require('sleep');
const McawsModels = require('./models/mcawsModels.js');

var baseHandler = require('aws-services-lib/lambda/base_handler.js')

function getRulesPayload(rule){
  return new Promise(function(resolve,reject) {
    if(rule.owner == "CUSTOM_LAMBDA"){
      rule.masterAccount = process.env.MASTER_MGM_AWS_ID;
    }
    resolve(rule);
  });
}


exports.handler = (event, context) => {
  baseHandler.handler(event, context);
}

baseHandler.get = function(params, callback) {
  
  var stepfunctions = new AWS.StepFunctions({region: process.env.AWS_DEFAULT_REGION});
  var input = {
    executionArn: params.executionArn
  };
  stepfunctions.describeExecution(input, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    }
    else {
      console.log(data);
      callback(null, data);
    }
  });
};

baseHandler.post = function(params, callback) {

  var stepfunctions = new AWS.StepFunctions({region: process.env.AWS_DEFAULT_REGION});

  var inputDoc = JSON.parse(fs.readFileSync(__dirname + '/json/state_machine_input.json', {encoding:'utf8'}));
  var ruleJson = JSON.parse(fs.readFileSync(__dirname + '/json/default_config_rules.json', {encoding:'utf8'}));
  
  var account = {
     "id": params.account,
     "name": params.awsname,
     "desc": params.awsdesc,
     "email": params.email,
     "type": params.account_type,
     "masterAwsId": params.masterBillingAWSAccount,
     "OfferingNum": params.offeringNum,
     "SGID": params.sgid,
     "guid": params.companyguid
  }
  inputDoc.account.billingDetails = account;
  if (account.id) {
    inputDoc.account.httpMethod = "GET";
    inputDoc.account.queryStringParameters.accountId = account.id;
  }
  else {
    inputDoc.account.httpMethod = "POST";
    inputDoc.account.body = account;
  }
  inputDoc.federation.authorizer_user_guid = params.userGuid;
  if(account.type.toLowerCase() != 'craws')
  {
    inputDoc.configrules.customerAccount = account.id;
    inputDoc.health.cloudformationLambdaExecutionRole = "cloudformation-lambda-execution-role"
    inputDoc.health.codePipelineServiceRole = "AWS-CodePipeline-Service"
    inputDoc.health.gitHubPersonalAccessToken = process.env.GIT_HUB_ACCESS_TOKEN
    inputDoc.health.subscriptionFilterDestinationArn = process.env.SUBSC_FILTER_DEST
    var stateMachineArn = process.env.STATE_MACHINE_ARN
  } else {
    var stateMachineArn = process.env.STATE_MACHINE_FOR_UNMANAGED_ACCOUNT_ARN;
  }

  console.log(inputDoc)

  var masterBillingRoleArn = "arn:aws:iam::" + params.masterBillingAWSAccount + ":role/" + process.env.ADMIN_ROLE_NAME;
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({region:process.env.KMS_REGION});
  console.log(inputDoc);
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      return callback(err);
    } else {
      console.log('Decrypt passwd:');
      console.log(process.env.DB_HOST);
      console.log(process.env.DB_USERNAME);
      console.log(masterBillingRoleArn);
      const mcawsDbObj = new McawsModels(process.env.DB_USERNAME,passwd.Plaintext.toString('ascii'),process.env.DB_HOST,'msaws');
      mcawsDbObj.AwsIamRole(function(resp) {
        resp.findOne({where: {arn: masterBillingRoleArn} }).then(roleResp => {
          const data = roleResp.dataValues;
          inputDoc.billing_master.roles = [{"roleArn": "arn:aws:iam::"+process.env.MASTER_MGM_AWS_ID+":role/federate"},{"roleArn": masterBillingRoleArn, "externalId": data.externalId}]
          Promise.all(ruleJson.map(getRulesPayload)).then(function(configrules){
            inputDoc.configrules.rules = configrules;
            var input = {
              stateMachineArn: stateMachineArn,
              input: JSON.stringify(inputDoc),
              name: "New-Account-Setup-For-" + params.awsname.replace(/ /g, '-')
            };
            console.log("======INPUT=====");
            console.log(input);
            stepfunctions.startExecution(input, function(err, data) {
              if (err) {
                console.log(err, err.stack);
                callback(err);
              }
              else {
                console.log(data);
                callback(null, data);
              }
            });
          });
        });
      });
    }
  })
};
