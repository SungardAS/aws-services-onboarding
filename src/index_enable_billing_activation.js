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
  console.log(bodyjson);
  var billingUrl = params.billingUrl+"?client_id="+ params.apiKey +"&client_secret="+params.secretKey;
  console.log(billingUrl);
  req({
    url: billingUrl, //URL to hit
    method: 'POST',
    json: bodyjson 
    }, function(error, response, body){
           console.log("error:");
           console.log(error);
           console.log("response:");
           console.log(response);
  });
}

exports.handler = (event, context, callback) => {

  // find account id
  var accountId = null;
  var retDoc = event.account.result.body;
  var billing = event.account.billingDetails;
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
  console.log(retDoc);
  if(accountId){
    registerAccount(accountId,billing);
    event.IntegrateBillingStatus=true;
  }else{
    console.log("Customer Accound not found");
    event.IntegrateBillingStatus=false;
  }

  callback(null, event);
};
