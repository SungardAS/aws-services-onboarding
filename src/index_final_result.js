
exports.handler = (event, context, callback) => {
  event.final_result.credentials = event.health.credentials;
  if(event.alerts_destination.result){
    event.final_result.alerts_destination = event.alerts_destination.result.body;
  }
  event.final_result.health = event.health.result.body;
  callback(null, event.final_result);
};
