
exports.handler = (event, context, callback) => {
  console.log("---------------------------")
  console.log(event)
  console.log("---------------------------")

  event.final_result.credentials = event.health.credentials;
  event.final_result.alerts_destination = event.alerts_destination.result.body;
  //event.final_result.health = event.health.result.body;
  callback(null, event.final_result);
};
