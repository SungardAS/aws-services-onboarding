
var AWS = require('aws-sdk');

const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: body
  }
};

var result = {};

exports.handler = function (event, context) {

  console.log(JSON.stringify(event));

  // find account list from the destination policy in the main region
  findDestination(process.env.AWS_DEFAULT_REGION, event.destinationName, function(err, destination) {
    if (err) {
      console.log(err);
      return context.fail(err, null);
    }
    else {
      // add new account to the accessPolicyDocument
      if (destination) {
        var accessPolicyDocument = JSON.parse(destination.accessPolicy);
        if (accessPolicyDocument.Statement[0].Principal.AWS.indexOf(event.accountToAdd) < 0) {
          accessPolicyDocument.Statement[0].Principal.AWS.push(event.accountToAdd);
        }
        // find all regions and create/update the stack in each region
        var ec2Main = new AWS.EC2({region:process.env.AWS_DEFAULT_REGION});
        ec2Main.describeRegions({}, function(err, regions) {
          if (err) {
            return context.fail(err, null);
          }
          else {
            build(regions.Regions, 0, event.destinationName, JSON.stringify(accessPolicyDocument), function(err, res) {
              if (err) {
                return context.fail(err, null);
              }
              else {
                return context.done(null, createResponse(200, res));
              }
            });
          }
        });
      }
      else {
        var err = "no destination is found with name [" + event.destinationName + "]";
        console.log(err);
        return context.fail(err, null);
      }
    }
  });
}

function build(regions, idx, destinationName, accessPolicy, callback) {

  var region = regions[idx].RegionName;

  // check if this region already has the destination stack
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  params = {
    accessPolicy: accessPolicy,
    destinationName: destinationName
  };
  cloudwatchlogs.putDestinationPolicy(params, function(err, data) {
    if (err) {
      console.log('error in cloudwatchlogs.putDestinationPolicy : ' + err);
      return callback(err, null);
    }
    else {
      console.log("completed to cloudwatchlogs.putDestinationPolicy in region, " + region);
      result[region] = true;
      if (++idx >= regions.length) {
        return callback(null, result);
      }
      else {
        build(regions, idx, destinationName, accessPolicy, callback);
      }
    }
  });
}

function findDestination(region, destinationName, callback) {
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  params = {
    DestinationNamePrefix: destinationName
  };
  cloudwatchlogs.describeDestinations(params, function(err, data) {
    if (err) {
      console.log("failed to find destination in region, " + region + " : " + err);
      callback(err, null);
    }
    else {
      //console.log(data);
      if (data && data.destinations.length > 0) {
        console.log("found destination in region, " + region + " : " + JSON.stringify(data));
        if (data.destinations[0].accessPolicy) {
          //callback(null, data.destinations[0].accessPolicy);
          callback(null, data.destinations[0]);
        }
        else {
          callback(null, null);
        }
      }
      else {
        console.log("no destination found in region, " + region);
        callback(null, null);
      }
    }
  });
}
