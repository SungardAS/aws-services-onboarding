
exports.handler = (event, context, callback) => {
  // we've got all outputs of the parallel actions, so merge results to the first action's output
  console.log("---------------------------")
  console.log(event)
  console.log("---------------------------")
  var cloudtrailResult = JSON.parse(event[0].cloudtrail.result.body);
  event[0].final_result.cloudtrail[event[0].cloudtrail.body.region] = cloudtrailResult.result;
  var awsconfigResult = JSON.parse(event[1].awsconfig.result.body);
  event[0].final_result.awsconfig[event[0].awsconfig.body.region] = awsconfigResult.result;
  callback(null, event[0]);
};
