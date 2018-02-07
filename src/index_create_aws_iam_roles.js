var fs = require('fs');
var uuid = require('node-uuid');
const awsIamRole = require('./lib/awsIamRole.js');


exports.handler = function (event, context, callback) {

  console.log(JSON.stringify(event));
  var options = {
    accessKeyId: event.credentials.Credentials.AccessKeyId,
    secretAccessKey: event.credentials.Credentials.SecretAccessKey,
    sessionToken: event.credentials.Credentials.SessionToken
  };
  var type = event.account.billingDetails.type;
  var awsroles = JSON.parse(fs.readFileSync(__dirname + '/json/federate-role_info.json', {encoding:'utf8'}));
  var dataDogPolicyDoc = JSON.parse(fs.readFileSync(__dirname + '/json/datadog-integration_policy.json', {encoding:'utf8'}));

  options.account= event.final_result.account_id;
  options.assumeRolePolicyDocument = awsroles.assumeRolePolicyDocument;
  options.assumeRolePolicyDocument.Statement[0].Principal.AWS = "arn:aws:iam::442294194136:role/federate"
  options.onboardAccount = true;
  options.path = awsroles.adminRolePath;

  if(event.account.billingDetails && event.account.billingDetails.type){
    roles = awsroles.roles[type.toLowerCase()];
    var dbIamRoles = []
    var dbAwsAccount = {accountId:options.account,accountName:event.account.billingDetails.name,accountDescription:event.account.billingDetails.desc,email:event.account.billingDetails.email,guid:event.account.billingDetails.guid,accountType:event.account.billingDetails.type};
    console.log(dbAwsAccount)
    for(i=0; i< roles.length; i++){
      var payload = {};
      Object.assign(payload, options, roles[i]);
      payload.externalId = uuid.v4();
      if(payload.roleName == 'DatadogAWSIntegrationRole') payload.PolicyDocument = dataDogPolicyDoc;
      console.log("--------------")
      console.log(payload)
      console.log("--------------")
      dbIamRoles.push({account:payload.account,externalId:payload.externalId,path:payload.path,roleName:payload.roleName})
      awsIamRole.createRole(payload, function(err, data) {
      console.log("111--------------")
        console.log(err)
        console.log(data)
      console.log("1111--------------")
      })
    }
    event.dbIamRoles = dbIamRoles;
    event.dbAwsAccount = dbAwsAccount;
  }else{
    console.log("invalid account type")
    console.log(type)
  }
 callback(null, event);
}
