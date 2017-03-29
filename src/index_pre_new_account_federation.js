
exports.handler = (event, context, callback) => {
  var roles = event.billing_master.roles;
  roles.push({"roleArn": "arn:aws:iam::" + event.final_result.account_id + ":role/OrganizationAccountAccessRole"});
  event.federation.roles = roles;
  callback(null, event);
};
