
var fs = require('fs');
var AWS = require('aws-sdk');

var baseHandler = require('aws-services-lib/lambda/base_handler.js')

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

  var stepfunctions = new AWS.StepFunctions({region: process.env.AWS_DEFAULT_REGION});

  var inputDoc = JSON.parse(fs.readFileSync(__dirname + '/json/state_machine_input.json', {encoding:'utf8'}));
  var default_configrules = JSON.parse(fs.readFileSync(__dirname + '/json/default_config_rules.json', {encoding:'utf8'}));

  console.log(default_configrules);

  //inputDoc.billing_master.roles = params.roles_to_federate_to_billing_master;
  var masterBillingRoleArn = "arn:aws:iam::" + params.masterBillingAWSAccount + ":role/" + process.env.ADMIN_ROLE_NAME;
  inputDoc.billing_master.roles = [{"roleArn": "arn:aws:iam::"+process.env.MASTER_MGM_AWS_ID+":role/federate"},{"roleArn": masterBillingRoleArn, "externalId": "73919e03-4c3b-4137-94dd-c509a0a6bb01"}]
  //inputDoc.account.billingDetails = params.account;
  var account = {
     "id": params.account,
     "name": params.awsname,
     "desc": params.awsdesc,
     "email": params.email,
     "type": params.account_type,
     "masterAwsId": params.masterBillingAWSAccount,
     "OfferingNum": params.offeringNum,
     "SGID": params.sgid,
     "sgid": params.companyguid
  }
  inputDoc.account.billingDetails = account;

  //if (params.account.id) {
  if (account.id) {
    inputDoc.account.httpMethod = "GET";
    //inputDoc.account.queryStringParameters.accountId = params.account.id;
    inputDoc.account.queryStringParameters.accountId = account.id;
  }
  else {
    inputDoc.account.httpMethod = "POST";
    
    //inputDoc.account.body = params.account;
    inputDoc.account.body = account;
  }
  inputDoc.federation.authorizer_user_guid = params.userGuid;

  //if(params.account.type.toLowerCase() != 'craws')
  if(account.type.toLowerCase() != 'craws')
  {
    //inputDoc.configrules.rules = params.default_configrules_to_enable;
    inputDoc.configrules.rules = [];
    inputDoc.configrules.customerAccount = params.account.id;
    //inputDoc.health.cloudformationLambdaExecutionRole = params.cloudformation_lambda_execution_role_name;
    inputDoc.health.cloudformationLambdaExecutionRole = process.env.CFN_LAMBDA_EXEC_ROLE
    //inputDoc.health.codePipelineServiceRole = params.codepipeline_service_role_name;
    inputDoc.health.codePipelineServiceRole = process.env.CODE_PIPELINE_SERVICE_ROLE
    //inputDoc.health.gitHubPersonalAccessToken = params.gitHub_personal_access_token;
    inputDoc.health.gitHubPersonalAccessToken = process.env.GIT_HUB_ACCESS_TOKEN
    //inputDoc.health.subscriptionFilterDestinationArn = params.subscription_filter_destination_arn;
    inputDoc.health.subscriptionFilterDestinationArn = process.env.SUBSC_FILTER_DEST
    var input = {
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(inputDoc)
    };
  }else{
    var input = {
      stateMachineArn: process.env.STATE_MACHINE_FOR_UNMANAGED_ACCOUNT_ARN,
      input: JSON.stringify(inputDoc)
    };
  }

  console.log("======INPUT=====");
  console.log(input);
  //if (params.execution_name) input.name = params.execution_name;
  input.name = "New-Account-Setup-For-" + params.awsname.replace(/ /g, '-')
  stepfunctions.startExecution(input, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    }
    else {
      console.log(data);
      // {"executionArn":"arn:aws:states:us-east-1:1234:execution:machine_name:12345678-1234-1234-1234-123456789012",
      //  "startDate":"2017-02-12T02:12:07.464Z"}
      callback(null, data);
    }
  });
};
