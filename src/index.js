
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

  console.log(params.default_configrules_to_enable);

  inputDoc.billing_master.roles = params.roles_to_federate_to_billing_master;
  inputDoc.configrules.rules = params.default_configrules_to_enable;
  inputDoc.configrules.customerAccount = params.account.id;
  inputDoc.account.billingDetails = params.account;

  if (params.account.id) {
    inputDoc.account.httpMethod = "GET";
    inputDoc.account.queryStringParameters.accountId = params.account.id;
  }
  else {
    inputDoc.account.httpMethod = "POST";
    inputDoc.account.body = params.account;
  }

  inputDoc.federation.authorizer_user_guid = params.userGuid;

  inputDoc.health.cloudformationLambdaExecutionRole = params.cloudformation_lambda_execution_role_name;
  inputDoc.health.codePipelineServiceRole = params.codepipeline_service_role_name;
  inputDoc.health.gitHubPersonalAccessToken = params.gitHub_personal_access_token;
  inputDoc.health.subscriptionFilterDestinationArn = params.subscription_filter_destination_arn;

  var input = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify(inputDoc),
  };
  console.log("======INPUT=====");
  console.log(input);
  if (params.execution_name) input.name = params.execution_name;
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
