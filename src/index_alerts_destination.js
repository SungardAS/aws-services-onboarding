
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

  var mainRegion = process.env.AWS_DEFAULT_REGION;

  // find destination in the main region
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: mainRegion});
  params = {
    DestinationNamePrefix: event.destinationName
  };
  cloudwatchlogs.describeDestinations(params).promise().then(function(data) {
    if (data && data.destinations.length > 0) {
      console.log("found destination in main region, " + mainRegion + " : " + JSON.stringify(data));
      if (data.destinations[0].accessPolicy) {
        return data.destinations[0];
      }
      else {
        var err = "no destination found in main region, " + mainRegion;
        throw err;
      }
    }
    else {
      var err = "no destination found in main region, " + mainRegion;
      throw err;
    }
  }).then(function(destination) {
    var accessPolicyDocument = JSON.parse(destination.accessPolicy);
    if (accessPolicyDocument.Statement[0].Principal.AWS.indexOf(event.accountToAdd) < 0) {
      accessPolicyDocument.Statement[0].Principal.AWS.push(event.accountToAdd);
    }
    destination.accessPolicy = JSON.stringify(accessPolicyDocument);
    return destination;
  }).then(function(destination) {
    var promises = [];
    var ec2Main = new AWS.EC2({region: mainRegion});
    ec2Main.describeRegions({}).promise().then(function(data) {
      data.Regions.forEach(function(region) {
        promises.push(build(region.RegionName, destination));
      });
      var result = {};
      Promise.all(promises).then(function(retArray, index) {
        data.Regions.forEach(function(region) {
          result[region.RegionName] = retArray[index];
        });
        context.done(null, retArray);
      }).catch(function(err) {
        throw err;
      });
    }).catch(function(err) {
      console.log("failed to find region list : " + err);
      throw err;
    });
  }).catch(function(err) {
    console.log(err);
    return context.fail(err, null);
  });
}

function build(region, destination) {
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  var params = {
    DestinationNamePrefix: destination.destinationName
  };
  return cloudwatchlogs.describeDestinations(params).promise().then(function(data) {
    if (data && data.destinations.length > 0) {
      console.log("found destination in region, " + region + " : " + JSON.stringify(data));
      return destination;
    }
    else {
      console.log("no destination found in region, " + region + ", so create one");
      params = {
        destinationName: destination.destinationName,
        roleArn: destination.roleArn,
        targetArn: destination.targetArn
      };
      return cloudwatchlogs.putDestination(params).promise().then(function(data) {
        console.log("completed to create a new destination in region, " + region);
        return destination;
      }).catch(function(err) {
        console.log("failed to create a destination in region, " + region + ": " + err);
        throw err;
      });
    }
  }).then(function(destination) {
    params = {
      accessPolicy: destination.accessPolicy,
      destinationName: destination.destinationName
    };
    return cloudwatchlogs.putDestinationPolicy(params).promise().then(function(data) {
      console.log("completed to cloudwatchlogs.putDestinationPolicy in region, " + region);
      return true;
    }).catch(function(err) {
      console.log("failed to put a destination policy in region, " + region + ": " + err);
      throw err;
    });
  });
}
