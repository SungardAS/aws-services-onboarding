
exports.handler = (event, context, callback) => {

  // find account id
  var accountId = null;
  var retDoc = event.account.result.body;
  if (typeof(retDoc) == 'string') {
    retDoc = JSON.parse(retDoc);
  }
  if (retDoc.Account) {
    // this is result of find account
    accountId = retDoc.Account.Id;
  }
  else {
    // this is result of create account
    accountId = retDoc.CreateAccountStatus.AccountId;
  }
  event.final_result.account_id = accountId;

  // set account id in alerts destination
  event.alerts_destination.accountToAdd = accountId;

  // set account id in health alert
  event.health.accountId = accountId;

  callback(null, event);
};