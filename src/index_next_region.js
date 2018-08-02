
exports.handler = (event, context, callback) => {
  var region = event.regions.shift();
  event.num_of_regions = event.regions.length;
  event.awsconfig.queryStringParameters.region = region;
  event.awsconfig.body.region = region;
  event.configrules.queryStringParameters.region = region;
  event.configrules.body.region = region;
  event.awsevents.body.region = region;
  console.log(event);
  callback(null, event);
};
