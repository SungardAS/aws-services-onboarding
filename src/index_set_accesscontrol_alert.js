exports.handler = function(event,context, callback) {
    var aws = require("aws-sdk");
    console.log(event);
    var accountInfo = event.account.billingDetails;
    console.log(accountInfo);
    if(accountInfo.type.toLowerCase() === 'managed') {
    var uuid = require("uuid");
    var id = uuid.v4();
    var aws_topic = new(require('aws-services-lib/aws/topic.js'))();
    var cloudwatchevents = new(require('aws-services-lib/aws/cloudwatchlog.js'))();
    var AccountId= accountInfo.id;
    var region=event.region;
    var snsPolicy = '{"Sid":"Allow_Publish_Events","Effect":"Allow","Principal":{"Service":"events.amazonaws.com"},"Action":"sns:Publish","Resource":"arn:aws:sns:'+region+':'+AccountId+':ConsoleSignInAlertTopic"}';
    var input = {
        topicName:"ConsoleSignInAlertTopic",
        ruleName: "ConsoleLoginAlertRule",
        ruleDescription: "Alert on Console Login",
        eventPattern:'{"detail-type":["AWS Console Sign In via CloudTrail"]}',
        ruleState:"ENABLED",
        targetId: id,
        emailAddress : process.env.ACCESSCONTROL_TO_ALERT_EMAIL,
        AccountId: AccountId,
        region: region,
    ////    roleArn: 'arn:aws:iam::442294194136:role/kameshLambdaTest',
        topicArn: null,
        sourceArn: null
    };
    console.log(input);
    console.log("------------------------------------------") ;
    
    function succeeded(input) {
        context.done(null, true);
    }
    function failed(input) {
        context.done(null, false);
    }
    function errored(err) {
        context.fail(err, null);
    }
  
    function appendPolicy (input, callback) {
          var topicPolicy = JSON.parse(input.attributes.Policy);
          var policy = JSON.parse(snsPolicy);
          topicPolicy.Statement.push(policy);
          var strPolicy = JSON.stringify(topicPolicy);
      	  console.log(strPolicy);         // successful response
      	  input.AttributeValue = strPolicy;
          aws_topic.setTopicAttributes(input);
    }
  
    var flows = [
    //    {func:aws_topic.createTopic, success:aws_topic.addPermission, failure:failed, error:errored},
    //    {func:aws_topic.addPermission, success:aws_topic.subscribeEmail, failure: failed, error: errored},
        {func:aws_topic.findTopic, success:aws_topic.subscribeEmail, failure:aws_topic.createTopic, error:errored},
        {func:aws_topic.createTopic, success:aws_topic.subscribeEmail, failure:failed, error:errored},
        {func:aws_topic.subscribeEmail, success:cloudwatchevents.createRule, failure:failed, error:errored},
        {func:cloudwatchevents.createRule, success:cloudwatchevents.createTarget, failure:failed, error:errored},
        {func:cloudwatchevents.createTarget, success:aws_topic.getTopicAttributes, failure:failed, error:errored},
        {func:aws_topic.getTopicAttributes, success:appendPolicy, failure: failed, error: errored},
        {func:appendPolicy, success:succeeded, error:errored}
        
    ];

    aws_topic.flows = flows;
    cloudwatchevents.flows = flows;
    flows[0].func(input);
 }
 callback(null, event);
};
