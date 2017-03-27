
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
    credentials = new Buffer(JSON.stringify(credentials)).toString('base64');
    event.cloudtrail.headers.Credentials = credentials;
    event.awsconfig.headers.Credentials = credentials;
    callback(null, event);
  }).catch(function(err) {
    callback(err);
  });
};
