'use strict';

const aws = require('aws-sdk');

const req = require('request');

const fs = require('fs');

const alertMailTemplate = './template/alertmail.txt';

//----------------------------------------------------------------------
function sendAlertMailBySes(params, errorMsg, billingData) {
  const ses = new aws.SES();
  const emailParams = {
    Destination: {
      ToAddresses: billingData.billingToEmail.split(',')
    },
    Source: billingData.billingFromEmail,
    Message: {
      Subject: {
        Data: 'MCAWS: Account Registration Failed with Billing System'
      },
      Body: { Html: { Data: '' } }
    }
  };
  fs.readFile(alertMailTemplate, (err, data) => {
    if (err) throw err;
    let maildata = data.toString();
    // replacing predefine mail template with actual error message
    maildata = maildata.replace(/__ERROR__/gm, JSON.stringify(errorMsg));
    maildata = maildata.replace(/__PARAMS__/gm, JSON.stringify(params));
    emailParams.Message.Body.Html.Data = maildata;
    ses.sendEmail(emailParams, (error, res) => {
      if (error) console.log(error, error.stack);
      else console.log(res);
    });
  });
}
//----------------------------------------------------------------------
function registerAccount(accId, params) {
  const datetime = new Date();
  const bodyjson = {
    sgId: Number(params.SGID),
    offeringNum: params.OfferingNum,
    masterAwsId: params.masterAwsId,
    customerAwsId: accId,
    customerAwsName: params.name,
    type: params.type,
    awsDesc: params.desc,
    activationDate: datetime
  };
  const billingUrl = `${params.billingUrl}?client_id=${params.apiKey}&client_secret=${params.secretKey}`;
  try {
     req({url: billingUrl, method: 'POST',json: bodyjson },(error, response, body) => {
        console.log(`error:  ${JSON.stringify(error)}`);
        console.log(`response: ${JSON.stringify(response.body)}`);
        console.log(`body: ${JSON.stringify(body)}`);
        console.log(`body: ${JSON.stringify(response.statusCode)}`);
        if (error) {
          sendAlertMailBySes(bodyjson, error, params);
        } else if (response.body.errorcode == '0') {
          console.log('successfully registered with billing system');
        } else {
          sendAlertMailBySes(bodyjson, response.body, params);
        }
     });
  } catch (err) {
    sendAlertMailBySes(bodyjson, err, params);
  }
}
//----------------------------------------------------------------------
exports.handler = (event, context, callback) => {
  // find account id
  let accountId = null;
  let retDoc = event.account.result.body;
  const billingInfo = event.account.billingDetails;
  if (typeof retDoc === 'string') {
    retDoc = JSON.parse(retDoc);
  }
  if (retDoc) {
    if (retDoc.Account) {
      // this is result of find account
      accountId = retDoc.Account.Id;
    } else {
      // this is result of create account
      accountId = retDoc.CreateAccountStatus.AccountId;
    }
    if (accountId) {
      // sending request to billing system(rest call) for register account
      registerAccount(accountId, billingInfo);
    } else {
      console.log(`customer account id not found: ${JSON.stringify(retDoc)}`);
      const errmsg = `Found Error While Creating Account:  ${JSON.stringify(retDoc.CreateAccountStatus.FailureReason)}`;
      console.log(errmsg);
    }
  } else {
    console.log('customer account id not found');
  }

  callback(null, event);
};
//----------------------------------------------------------------------
