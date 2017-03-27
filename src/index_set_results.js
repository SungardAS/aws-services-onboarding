
exports.handler = (event, context, callback) => {
  // we've got all outputs of the parallel actions, so merge results to the first action's output
  var cloudtrailResult = JSON.parse(event[0].cloudtrail.result.body);
  cloudtrailResult.region = event[0].cloudtrail.body.region;
  event[0].final_result.cloudtrail.push(cloudtrailResult);
  var awsconfigResult = JSON.parse(event[1].awsconfig.result.body);
  awsconfigResult.region = event[1].awsconfig.body.region;
  event[0].final_result.awsconfig.push(awsconfigResult);
  callback(null, event[0]);
};
