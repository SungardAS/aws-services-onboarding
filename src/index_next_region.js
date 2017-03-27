
exports.handler = (event, context, callback) => {
  var region = event.regions.shift();
  event.num_of_regions = event.regions.length;
  event.cloudtrail.queryStringParameters.region = region;
  event.cloudtrail.body.region = region;
  event.awsconfig.queryStringParameters.region = region;
  event.awsconfig.body.region = region;
  callback(null, event);
};
