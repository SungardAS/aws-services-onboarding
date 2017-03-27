
exports.handler = (event, context, callback) => {
  //event.account.id = Math.random().toString().replace('0.', '').replace('.', '');
  var accountId = '808331752250';

  // set account info
  event.account.id = accountId;
  event.account.created_at = new Date().toString();

  // set account info for federation
  var roles = event.billing_master.roles;
  roles.push({"roleArn": "arn:aws:iam::" + event.account.id + ":role/OrganizationAccountAccessRole"});
  event.federation.roles = roles;
  event.federation.authorizer_user_guid = accountId;

  // set account id in alerts destination
  event.alerts_destination.accountToAdd = accountId;

  // set account id in health alert
  event.health.accountId = accountId;

  callback(null, event);
};
