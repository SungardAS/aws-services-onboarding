
var uuid = require('node-uuid');
var CWLogs = require('aws-services-lib/aws/cloudwatchlog.js');
var aws_cloudwatchlog = new CWLogs();

var logGroupName = process.env.ACCOUNT_LOG_GROUP_NAME;

exports.handler = function (event, context) {

  function succeeded(input) {
    event.cloudwatchlog = true;
    context.done(null, event);
  }
  function failed(err) {
    event.cloudwatchlog = false;
    context.done(null, event);
  }
  function errored(err) {
    event.cloudwatchlog = err;
    context.done(null, event);
  }

  var message = "Health Alert : " + event.health;
  message += "\n\nAlert Destinations : \n" + JSON.stringify(event.alerts_destination);
  message += "\n\nCloudTrail : \n" + JSON.stringify(event.cloudtrail);
  message += "\n\nAWSConfig: \n" + JSON.stringify(event.awsconfig);
  var sentAt = (new Date()).toISOString();
  var logMessage = {
    "awsid": event.account_id,
    "subject": "Result of Creating New AWS Account",
    "message": message,
    "sentBy": process.env.STATE_MACHINE_ARN,
    "sentAt": sentAt
  };

  var input = {
    region: process.env.AWS_DEFAULT_REGION,
    groupName: logGroupName,
    streamName: sentAt.replace(/:/g, '') + "-" + uuid.v4(),
    logMessage: JSON.stringify(logMessage),
    timestamp: (new Date()).getTime()
  };
  console.log(input);

  var flows = [
    {func:aws_cloudwatchlog.findLogGroup, success:aws_cloudwatchlog.findLogStream, failure:aws_cloudwatchlog.createLogGroup, error:errored},
    {func:aws_cloudwatchlog.createLogGroup, success:aws_cloudwatchlog.findLogStream, failure:failed, error:errored},
    {func:aws_cloudwatchlog.findLogStream, success:aws_cloudwatchlog.createLogEvents, failure:aws_cloudwatchlog.createLogStream, error:errored},
    {func:aws_cloudwatchlog.createLogStream, success:aws_cloudwatchlog.createLogEvents, failure:failed, error:errored},
    {func:aws_cloudwatchlog.createLogEvents, success:succeeded, failure:failed, error:errored}
  ]
  aws_cloudwatchlog.flows = flows;
  flows[0].func(input);
}
