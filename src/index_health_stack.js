
var fs = require('fs');
var AWS = require('aws-sdk');
var stack_builder = new (require('aws-services-lib/stack_builder'))();

const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: body
  }
};

exports.handler = function (event, context) {

  console.log(JSON.stringify(event));

  var input = event;

  var creds = new AWS.Credentials({
    accessKeyId: input.credentials.AccessKeyId,
    secretAccessKey: input.credentials.SecretAccessKey,
    sessionToken: input.credentials.SessionToken
  });

  // create cloudformation and codepipeline roles first if not exist
  createRole(creds, input.cloudformationLambdaExecutionRole, function(err, data) {
    if (err) {
      console.log("Failed to created a role, " + input.cloudformationLambdaExecutionRole);
      context.fail(err, null);
    }
    else {
      createRole(creds, input.codePipelineServiceRole, function(err, data) {
        if (err) {
          console.log("Failed to created a role, " + input.codePipelineServiceRole);
          context.fail(err, null);
        }
        else {
          // set the param values
          input.params.templateStr = input.templateStr;
          input.params.parameters.forEach(function(param) {
            if (param.ParameterKey == "CloudformationLambdaExecutionRoleArn") {
              param.ParameterValue = "arn:aws:iam::" + input.accountId + ":role/cloudformation-lambda-execution-role"
            }
            else if (param.ParameterKey == "CodePipelineServiceRoleArn") {
              param.ParameterValue = "arn:aws:iam::" + input.accountId + ":role/AWS-CodePipeline-Service"
            }
            else if (param.ParameterKey == "ParameterOverrides") {
              var paramValue = {
                "HealthLogGroupName": input.healthLogGroupName,
                "SubscriptionFilterDestinationArn": input.subscriptionFilterDestinationArn
              };
              param.ParameterValue = JSON.stringify(paramValue);
            }
            else if (param.ParameterKey == "GitHubPersonalAccessToken") {
              param.ParameterValue = input.gitHubPersonalAccessToken;
            }
          });

          // now stack operation
          input.params.creds = creds;
          input.params.region = process.env.AWS_DEFAULT_REGION;
          stack_builder[input.action](input.params, function(err, data) {
            if(err) {
              if (input.action == 'launch') {
                console.log("Error occurred during " + input.action + " : " + err);
                context.fail(err, null);
              }
              else if (input.action == 'drop') {
                console.log("stack was already removed");
                context.fail(err, null);
              }
            }
            else {
              console.log(data);
              console.log("completed to " + input.action + " stack");
              context.done(null, createResponse(200, data));
            }
          });
        }
      });
    }
  });
}

function createRole(creds, roleName, callback) {

  var aws_role = new (require('aws-services-lib/aws/role.js'))();

  var trustDocument = fs.readFileSync(__dirname + '/json/' + roleName + '_trust.json', {encoding:'utf8'});
  console.log(trustDocument);

  var policyDocument = fs.readFileSync(__dirname + '/json/' + roleName + '_policy.json', {encoding:'utf8'});
  console.log(policyDocument);

  var input = {
    creds: creds,
    region: process.env.AWS_DEFAULT_REGION,
    roleName : roleName,
    assumeRolePolicyDocument: trustDocument,
    inlinePolicyName : "InlinePolicy",
    inlinePolicyDocument: policyDocument
  };

  function succeeded(input) { callback(null, true); }
  function failed(input) { callback(null, false); }
  function errored(err) { callback(err, null); }

  var flows = [
    {func:aws_role.findRole, success:succeeded, failure:aws_role.createRole, error:errored},
    {func:aws_role.createRole, success:aws_role.createInlinePolicy, failure:failed, error:errored},
    {func:aws_role.createInlinePolicy, success:aws_role.wait, failure:failed, error:errored},
    {func:aws_role.wait, success:succeeded, failure:failed, error:errored}
  ];
  aws_role.flows = flows;

  flows[0].func(input);
};
