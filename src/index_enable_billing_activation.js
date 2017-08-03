'use strict';
const aws = require('aws-sdk');
const req = require("request");
const fs = require('fs');
const alertMailTemplate = "./template/alertmail.txt";

//----------------------------------------------------------------------
var sendAlertMailBySes = function(params, errorMsg, email){
  var ses = new aws.SES();
  var emailParams = {
    Destination: {
      ToAddresses : [email]
    },
    Source: email,
    Message: {
      Subject: {
        Data: 'MCAWS: Account Registration Failed with Billing System'
      },
      Body: { Html: { Data: ''}}
    }
  };
  fs.readFile(alertMailTemplate, function(err, data) {
    if(err) throw err;
    data = data.toString();
    // replacing predefine mail template with actual error message
    data = data.replace(/__ERROR__/gm, JSON.stringify(errorMsg)); 
    data = data.replace(/__PARAMS__/gm, JSON.stringify(params));
    emailParams.Message.Body.Html.Data = data;
    ses.sendEmail(emailParams, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  });
}
//----------------------------------------------------------------------
var registerAccount = function(accId, params, event) {
  var datetime = new Date();
  var bodyjson = {
    sgId: params.SGID,
    offeringNum: params.OfferingNum,
    masterAwsId: params.masterAwsId,
    customerAwsId: accId,
    customerAwsName: params.name,
    type: params.type ,
    awsDesc: params.desc,
    activationDate: datetime
  }
  var billingUrl = params.billingUrl+"?client_id="+ params.apiKey +"&client_secret="+params.secretKey;
  try{
    req({
      url: billingUrl, //URL to hit
      method: 'POST',
      json: bodyjson 
    },function(error, response, body){
        console.log("error:" +JSON.stringify(error));
        console.log("response:"+ JSON.stringify(response.body));
        console.log("body:"+ JSON.stringify(body));
        console.log("body:"+ JSON.stringify(response.statusCode));
	if(error){
          event.BillingActivationStatus=false;
	  sendAlertMailBySes(bodyjson, error, params.email)
        }else{
          if(response.body.errorcode == "0"){
            event.BillingActivationStatus=true;
          }else{
            event.BillingActivationStatus=false;
	    // send alrt mail to service now group
	    sendAlertMailBySes(bodyjson, response.body, params.email)
	  }
	}
    });
  }catch(err){
    event.BillingActivationStatus=false;
    sendAlertMailBySes(bodyjson, error, params.email)
  }
}
//----------------------------------------------------------------------
exports.handler = (event, context, callback) => {
  // find account id
  console.log(event)
  var accountId = null;
  var retDoc = event.account.result.body;
  var billingInfo = event.account.billingDetails;
  if (typeof(retDoc) == 'string') {
    retDoc = JSON.parse(retDoc);
  }
  if(retDoc){ 
    if (retDoc.Account) {
      // this is result of find account
      accountId = retDoc.Account.Id;
    } else {
      // this is result of create account
      accountId = retDoc.CreateAccountStatus.AccountId;
    }
    if(accountId){
      // sending request to billing system(rest call) for register account
      registerAccount(accountId, billingInfo, event);
    } else{
      console.log("customer account id not found:"+JSON.stringify(retDoc));// its happened when account creation failed
      sendAlertMailBySes(billingInfo, retDoc.CreateAccountStatus.FailureReason, billingInfo.email)
      event.BillingActivationStatus=false;
    }
  } else{
      console.log("customer account id not found");
      sendAlertMailBySes(billingInfo, retDoc, billingInfo.email)
      event.BillingActivationStatus=false;
  }

  callback(null, event);
};
//----------------------------------------------------------------------
if (require.main === module) {
  var  bodyjson= { sgId: '1111111111',
    offeringNum: '123.2',
    masterAwsId: '054649790173',
    customerAwsId: '405723553155',
    customerAwsName: 'Dino-1513',
    type: 'Self-Managed',
    awsDesc: 'Test MA-1513',
    activationDate: "Tue Aug 01 2017 06:48:46 GMT+0000 (UTC)" 
  }
  sendAlertMailBySes(bodyjson, 'error', 'chandra.mishra@sungardas.com')
}
//----------------------------------------------------------------------

