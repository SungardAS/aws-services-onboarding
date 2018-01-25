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
  var awsroles = JSON.parse(fs.readFileSync(__dirname + '/json/federate-role_info.json', {encoding:'utf8'}));
  var dataDogPolicyDoc = JSON.parse(fs.readFileSync(__dirname + '/json/datadog-integration_policy.json', {encoding:'utf8'}));
  options.assumeRolePolicyDocument = awsroles.assumeRolePolicyDocument;
  options.assumeRolePolicyDocument.Statement[0].Principal.AWS = "arn:aws:iam::442294194136:role/federate"
  //options.roleArn = awsroles.roleArn;

  if(event.account.billingDetails && event.account.billingDetails.type){
    roles = awsroles.roles[type.toLowerCase()];
    console.log(roles)
    for (const role in roles) {
      Object.assign(options, roles[role]);
      console.log(options)
      awsIamRole.createRole(options, function(err, data) {
        console.log(err)
        console.log(data)
      })
    }
  }else{
    console.log("invalid account type")
    console.log(type)

  }
 callback(null, event);
}
