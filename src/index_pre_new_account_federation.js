
exports.handler = (event, context, callback) => {
  var roles = event.billing_master.roles;

  var role = new (require('aws-services-lib/aws/role'))();
  role.findAccountId({}, function(err, accountId){
    if (err)  callback(err);
    else {
      console.log("current account : " + accountId);
      if (event.final_result.account_id != accountId) {
        roles.push({"roleArn": "arn:aws:iam::" + event.final_result.account_id + ":role/OrganizationAccountAccessRole"});
      }
      event.federation.roles = roles;
      callback(null, event);
    }
  });
};
