
exports.handler = (event, context, callback) => {
  // we've got all outputs of the parallel actions, so merge results to the first action's output
  var awsconfigResult = JSON.parse(event.awsconfig.result.body);
  event.final_result.awsconfig[event.awsconfig.body.region] = awsconfigResult.result;
  var awseventsResult = JSON.stringify(event.awsevents.result);
  event.final_result.awsevents[event.awsevents.body.region] = awseventsResult;
  callback(null, event);
};
