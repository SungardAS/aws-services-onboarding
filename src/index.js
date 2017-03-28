
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

  var input = JSON.parse(fs.readFileSync(__dirname + '/json/state_machine_input.json', {encoding:'utf8'}));
  if (params.account_id) {
    input.account_id = params.account_id;
  }
  input.billing_master.roles = params.roles_to_federate_to_billing_master;
  input.federation.authorizer_user_guid = params.userGuid;
  input.alerts_destination.params.parameters.forEach(function(attr) {
    if (attr.ParameterKey == "KinesisStreamArn") {
      attr.ParameterValue = params.kinesis_stream_arn;
    }
    else if (attr.ParameterKey == "CWLtoKinesisRoleArn") {
      attr.ParameterValue = params.cwl_to_kinesis_role_arn;
    }
  });
  input.health.cloudformationLambdaExecutionRole = params.cloudformation_lambda_execution_role_name;
  input.health.codePipelineServiceRole = params.codepipeline_service_role_name;
  input.health.gitHubPersonalAccessToken = params.gitHub_personal_access_token;
  input.health.subscriptionFilterDestinationArn = params.subscription_filter_destination_arn;

  var input = {
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify(input),
    //name: 'STRING_VALUE'
  };
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
