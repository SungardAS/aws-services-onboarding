
var fs = require('fs');
var AWS = require('aws-sdk');
var StackBuilder = require('aws-services-lib/stack_builder');

var DESTINATION_TEMPLATE_PATH = '/templates/destination.yaml'

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
  findDestinationPolicy(process.env.AWS_DEFAULT_REGION, event.destinationName, function(err, policy) {
    if (err) {
      console.log(err);
      return context.fail(err, null);
    }
    else {
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
      event.params.parameters.forEach(function(param) {
        if (param.ParameterKey == "Accounts") {
          param.ParameterValue = accountListStr;
        }
      });
      console.log(event.params);

      // find all regions and create/update the stack in each region
      var ec2Main = new AWS.EC2({region:process.env.AWS_DEFAULT_REGION});
      ec2Main.describeRegions({}, function(err, regions) {
        if (err) {
          context.fail(err, null);
        }
        else {
          build(regions.Regions, 0, event, function(err, res) {
            if (err) {
              context.fail(err, null);
            }
            else {
              console.log("\n\nStarting to check stack status");
              checkStatus(regions.Regions, 0, event, function(err, res) {
                if (err) {
                  context.fail(err, null);
                }
                else {
                  context.done(null, createResponse(200, res));
                }
              });
            }
          });
        }
      });
    }
  });
}

function build(regions, idx, event, callback) {

  var params = JSON.parse(JSON.stringify(event.params));
  params.region = regions[idx].RegionName;
  params.nowait = true;

  // check if this region already has the destination stack
  var cloudformation = new AWS.CloudFormation({region: params.region});
  cloudformation.describeStacks({ StackName: event.params.stackName }, function(err, data) {
    if (err) {
      console.log('error in cloudformation.describeStacks : ' + err);
      // read in the destination template
      params.templateStr = fs.readFileSync(__dirname + DESTINATION_TEMPLATE_PATH, {encoding:'utf8'});
      params.usePreviousTemplate = false;
    }
    else {
      console.log(data);
      params.usePreviousTemplate = true;
    }

    // now stack operation
    var stack_builder = new StackBuilder();
    stack_builder[event.action](params, function(err, status) {
      if(err) {
        if (event.action == 'launch') {
          console.log("Error occurred during " + event.action + " in region, " + params.region + " : " + err);
          result[params.region] = err;
          return callback(null, result);
        }
        else if (event.action == 'drop') {
          console.log("stack was already removed in region, " + params.region);
          result[params.region] = err;
          return callback(null, result);
        }
      }
      else {
        console.log("completed to " + event.action + " stack in region, " + params.region + " : " + status);
        result[params.region] = status;
        if (++idx >= regions.length) {
          return callback(null, result);
        }
        else {
          build(regions, idx, event, callback);
        }
      }
    });
  });
}

function checkStatus(regions, idx, event, callback) {

  var params = JSON.parse(JSON.stringify(event.params));
  params.region = regions[idx].RegionName;

  // now stack operation
  if (result[params.region]) {
    var stack_builder = new StackBuilder();
    stack_builder["waitFor" + event.action](params, function(err, status) {
      if(err) {
        console.log("Error occurred during waitForComplete in region, " + params.region + " : " + err);
        result[params.region] = err;
        return callback(null, result);
      }
      else {
        console.log("completed to waitForComplete in region, " + params.region + " : " + status);
        result[params.region] = status;
        if (++idx >= regions.length) {
          return callback(null, result);
        }
        else {
          checkStatus(regions, idx, event, callback);
        }
      }
    });
  }
}

function findDestinationPolicy(region, destinationName, callback) {
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
          callback(null, data.destinations[0].accessPolicy);
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
