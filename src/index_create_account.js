
exports.handler = (event, context, callback) => {
  //event.account.id = Math.random().toString().replace('0.', '').replace('.', '');
  if (event.account.id == null) {
    // create a new account, but temporarily set an already created account
    event.account.id = '808331752250';
    event.account.created_at = new Date().toString();
  }
  var accountId = event.account.id;

  // set account info for federation
  var roles = event.billing_master.roles;
  roles.push({"roleArn": "arn:aws:iam::" + event.account.id + ":role/OrganizationAccountAccessRole"});
  event.federation.roles = roles;

  // set account id in alerts destination
  event.alerts_destination.accountToAdd = accountId;

  // set account id in health alert
  event.health.accountId = accountId;

  callback(null, event);
};


// sgas-msaws-api / api / controllers / AwsAccountController.js
// sgas-msaws-api / api / services / awsIAMService.js
