var fs = require('fs');
const awsIamRole = require('./lib/awsIamRole.js');


exports.handler = function (event, context, callback) {

  console.log(JSON.stringify(event));
  var options = {
    accessKeyId: event.credentials.Credentials.AccessKeyId,
    secretAccessKey: event.credentials.Credentials.SecretAccessKey,
    sessionToken: event.credentials.Credentials.SessionToken
  };
  options.accountId= event.final_result.account_id;
  var type = event.account.billingDetails.type;
  console.log(options)
  var awsroles = JSON.parse(fs.readFileSync(__dirname + '/json/default_roles.json', {encoding:'utf8'}));
  var dataDogPolicyDoc = JSON.parse(fs.readFileSync(__dirname + '/json/datadog-integration_policy.json', {encoding:'utf8'}));
  if(event.billingDetails && event.billingDetails.type){
    roles = awsroles[type.toLowerCase()];
    console.log(roles)
    for (const role in roles) {
      Object.assign(options, roles[role]);
    console.log(options)
      awsIamRole.createRole(options, function(err, data) {
        console.log(err)
        console.log(data)
      })
    }
  }
 callback(null, event);
}
