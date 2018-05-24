
exports.handler = (event, context, callback) => {
console.log(JSON.stringify(event[0]));
  // we've got all outputs of the parallel actions, so merge results to the first action's output
  var cloudtrailResult = JSON.parse(event[0].cloudtrail.result.body);
  event[0].final_result.cloudtrail[event[0].cloudtrail.body.region] = cloudtrailResult.result;
  var awsconfigResult = JSON.parse(event[1].awsconfig.result.body);
  event[0].final_result.awsconfig[event[0].awsconfig.body.region] = awsconfigResult.result;
  var awseventsResult = JSON.parse(event[0].awsevents.result.body);
  event[0].final_result.awsevents[event[0].awsevents.body.region] = awseventsResult.result;
  callback(null, event[0]);
};
