
var AWS = require('aws-sdk');
var StackBuilder = require('aws-services-lib/stack_builder');

const createResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    body: body
  }
};

var result = [];

exports.handler = function (event, context) {

  console.log(JSON.stringify(event));

  var ec2Main = new AWS.EC2({region:'us-east-1'});
  ec2Main.describeRegions({}).promise().then(function(data) {
    var promises = [];
    data.Regions.forEach(function(region) {
      promises.push(build(region, event));
    });
    return Promise.all(promises).then(function(retArray) {
      context.done(null, createResponse(200, retArray));
    }).catch(function(err) {
      context.fail(err, null);
    });
  }).catch(function(err) {
    context.fail(err, null);
  });
}

function build(region, event) {

  var params = JSON.parse(JSON.stringify(event.params));
  params.region = region.RegionName;

  return findDestinationPolicy(params.region, event.destinationName).then(function(policy) {
    // add new account to the policyDocument
    var accountListStr = "";
    if (policy) {
      var policyDocument = JSON.parse(policy);
      if (policyDocument.Statement[0].Principal.AWS.indexOf(event.accountToAdd) >= 0) {
        accountListStr = policyDocument.Statement[0].Principal.AWS.join();
      }
      else {
        accountListStr = policyDocument.Statement[0].Principal.AWS.join() + "," + event.accountToAdd;
      }
    }
    else {
      accountListStr = event.accountToAdd;
    }
    params.parameters.forEach(function(param) {
      if (param.ParameterKey == "Accounts") {
        param.ParameterValue = accountListStr;
      }
    });
    console.log(params);

    // now stack operation
    var stack_builder = new StackBuilder();
    stack_builder[event.action](params, function(err, status) {
      if(err) {
        if (event.action == 'launch') {
          console.log("Error occurred during " + event.action + " in region, " + params.region + " : " + err);
          //result.push({'region':params.region, 'result':err});
          //return callback(null, result);
          var res = {'region':params.region, 'result':err};
          return Promise.resolve(res);
        }
        else if (event.action == 'drop') {
          console.log("stack was already removed in region, " + params.region);
          //result.push({'region':params.region, 'result':err});
          //return callback(null, result);
          var res = {'region':params.region, 'result':err};
          return Promise.resolve(res);
        }
      }
      else {
        console.log("completed to " + event.action + " stack in region, " + params.region + " : " + status);
        /*result.push({'region':params.region, 'result':status});
        if (++idx >= regions.length) {
          return callback(null, result);
        }
        else {
          build(regions, idx, event, callback);
        }*/
        var res = {'region':params.region, 'result':status};
        return Promise.resolve(res);
      }
    });
  }).catch(function(err) {
    console.log(err);
    return Promise.reject(err);
  });
}

function findDestinationPolicy(region, destinationName, callback) {
  var cloudwatchlogs = new AWS.CloudWatchLogs({region: region});
  params = {
    DestinationNamePrefix: destinationName
  };
  return cloudwatchlogs.describeDestinations(params).promise().then(function(err, data) {
    console.log(data);
    if (data && data.destinations.length > 0) {
      console.log("found destination in region, " + region + " : " + data);
      if (data.destinations[0].accessPolicy) {
        return data.destinations[0].accessPolicy;
      }
      else {
        return null;
      }
    }
    else {
      console.log("no destination found in region, " + region);
      return null;
    }
  }).catch(function(err) {
    console.log("failed to find destination in region, " + region + " : " + err);
    return null;
  });
}
