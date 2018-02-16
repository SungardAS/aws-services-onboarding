'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');

exports.handler = function(event, context, callback) {
  console.log(JSON.stringify(event));
  const dbIamRoles = event.dbIamRoles;
  const dbAwsAccount = event.dbAwsAccount;
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({ region: process.env.KMS_REGION });
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      callback(err);
      return;
    }
    const mcawsDbObj = new McawsModels(
      process.env.DB_USERNAME,
      passwd.Plaintext.toString('ascii'),
      process.env.DB_HOST,
      'msaws'
    );
    mcawsDbObj.AwsAccount(resp1 => {
      return resp1.create(dbAwsAccount).then(accData => {
        console.log("000000000");
        if (dbAwsAccount.account_type != 'craws') {
          for (let idx = 0; idx < dbIamRoles.length; idx++) {
            dbIamRoles[idx].account = accData.dataValues.id;
            mcawsDbObj.AwsIamRole(resp2 => {
              return resp2.create(dbIamRoles[idx]).then(roleData => {
                console.log(roleData);
              }).then(() => console.log('role updationDone :)'))
              .catch(err => console.log(err));
        console.log("100000000");
            });
        console.log("200000000");
          }
        console.log("300000000");
        }
        console.log("400000000");
      }).then(() => console.log('Account updationDone :)'))
      .catch(err => console.log(err));
        console.log("500000000");
    });
        console.log("600000000");
  });
        console.log("000000000");
 callback(null, event);
};
