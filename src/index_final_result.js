
exports.handler = (event, context, callback) => {
  if(event.alerts_destination.result){
    event.final_result.alerts_destination = event.alerts_destination.result.body;
  }
  if(event.health){
    event.final_result.credentials = event.health.credentials;
    event.final_result.health = event.health.result.body;
  }
  callback(null, event.final_result);
};
