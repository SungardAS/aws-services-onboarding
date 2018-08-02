
var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  var ec2Main = new AWS.EC2({region:'us-east-1'});
  ec2Main.describeRegions({}).promise().then(function(data) {
    var regions = [];
    data.Regions.map(function(region) {
      regions.push(region.RegionName);
    });
    event.regions = regions;
    event.num_of_regions = regions.length;
    var credentials = {
      "AccessKeyId": event.credentials.Credentials.AccessKeyId,
      "SecretAccessKey": event.credentials.Credentials.SecretAccessKey,
      "SessionToken": event.credentials.Credentials.SessionToken
    }
    event.awsevents.Credentials = credentials;
    credentials = new Buffer(JSON.stringify(credentials)).toString('base64');
    var cloudtrailResult = JSON.parse(event.cloudtrail.result.body);
    event.final_result.cloudtrail[event.cloudtrail.body.region] = cloudtrailResult.result;
    event.awsconfig.headers.Credentials = credentials;
    event.configrules.headers.Credentials = credentials;
    console.log(event);
    callback(null, event);
  }).catch(function(err) {
    console.log(err)
    callback(err);
  });
};
