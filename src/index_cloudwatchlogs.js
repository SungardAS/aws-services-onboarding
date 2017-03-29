
var uuid = require('node-uuid');
var CWLogs = require('aws-services-lib/aws/cloudwatchlog.js');
var aws_cloudwatchlog = new CWLogs();

var logGroupName = process.env.ACCOUNT_LOG_GROUP_NAME;

exports.handler = function (event, context) {

  function succeeded(input) { context.done(null, true); }
  function failed(err) { context.fail(err, null); }
  function errored(err) { context.fail(err, null); }

  var message = {
    alerts_destination: event.alerts_destination,
    cloudtrail: event.cloudtrail,
    awsconfig: event.awsconfig,
    health: event.health
  }
  var sentAt = (new Date()).getTime();
  var logMessage = {
    "awsid": event.account_id,
    "subject": "Result of Creating New AWS Account",
    "message": JSON.stringify(message),
    "sentBy": process.env.STATE_MACHINE_ARN,
    "sentAt": sentAt
  };

  var input = {
    region: region,
    groupName: logGroupName,
    streamName: sentAt.replace(/:/g, '') + "-" + uuid.v4(),
    logMessage: JSON.stringify(logMessage),
    timestamp: sentAt
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
