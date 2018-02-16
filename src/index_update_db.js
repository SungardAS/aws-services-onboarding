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
      resp1.create(dbAwsAccount).then(accData => {
        if (dbAwsAccount.account_type != 'craws') {
          for (let idx = 0; idx < dbIamRoles.length; idx++) {
            dbIamRoles[idx].account = accData.dataValues.id;
            mcawsDbObj.AwsIamRole(resp2 => {
              resp2.create(dbIamRoles[idx]).then(roleData => {
                console.log(roleData);
              });
            });
          }
        }
      });
  callback(null, event);
    });
  });
};
