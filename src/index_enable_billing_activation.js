var req = require("request");
var registerAccount = function(accId, params) {
  var datetime = new Date();
  var bodyjson = {
    SGID: params.SGID,
    OfferingNum: params.OfferingNum,
    masterAwsId: params.masterAwsId,
    customerAwsId: accId,
    customerAwsName: params.name,
    type: params.type ,
    awsDesc: params.desc,
    activationDate: datetime
  }
  console.log("bodyjson:"+bodyjson);
  console.log("URL:"+params.billingUrl);
  req({
    url: params.billingUrl, //URL to hit
    method: 'POST',
    json: bodyjson 
    }, function(error, response, body){
           console.log("error:"+error);
           console.log("response:"+response);
  });
}

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
  console.log("retDoc:"+retDoc);
  if(accountId){
    registerAccount(accountId,retDoc.billingDetails);
    event.IntegrateBillingStatus=truea;
  }else{
    console.log("Customer Accound not found");
    event.IntegrateBillingStatus=false;
  }

  callback(null, event);
};
