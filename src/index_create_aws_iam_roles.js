
const awsIamRole = require('lib/awsIamRole.js');


exports.handler = function (event, context) {

  console.log(JSON.stringify(event));
  var options = {
    accessKeyId: event.credentials.Credentials.AccessKeyId,
    secretAccessKey: event.credentials.Credentials.SecretAccessKey,
    sessionToken: event.credentials.Credentials.SessionToken
  };
  var options.accountId= event.final_result.account_id;
  var type = event.billingDetails.type;
  console.log(options)
  var awsroles = JSON.parse(fs.readFileSync(__dirname + '/json/default_roles.json', {encoding:'utf8'}));
  var dataDogPolicyDoc = JSON.parse(fs.readFileSync(__dirname + '/json/datadog-integration_policy.json', {encoding:'utf8'}));
  if(event.billingDetails && event.billingDetails.type){
    roles = awsroles[type];
    console.log(roles)
    for (const role in roles) {
      Object.assign(options, role);
    console.log(options)
      awsIamRole.createRole(options, function(err, data) {
      }
    }
  }
 callback(null, event);
}
