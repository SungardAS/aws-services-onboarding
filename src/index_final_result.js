
exports.handler = (event, context, callback) => {
  if(event.alerts_destination.result){
    event.final_result.alerts_destination = event.alerts_destination.result.body;
  }
  if(event.health){
    event.final_result.credentials = event.health.credentials;
    if(event.health.result) event.final_result.health = event.health.result.body;
  }
  if(event.dbIamRoles){
    event.final_result.dbIamRoles = event.dbIamRoles;
  }
  if(event.dbAwsAccount){
    event.final_result.dbAwsAccount = event.dbAwsAccount;
  }
  callback(null, event.final_result);
};
