'use strict';
//const mysql = require('mysql');
const AWS = require('aws-sdk');
const mcawsModels = require('./models/mcawsModels.js');

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
      return callback(err);
    }
      mcawsModels.AwsAccount(process.env.DB_USERNAME,passwd.Plaintext.toString('ascii'),process.env.DB_HOST,'msaws', function(resp1) {
      resp1.create(dbAwsAccount).then(accData => {
        if (dbAwsAccount.account_type != 'craws') {
          for (let idx = 0; idx < dbIamRoles.length; idx++) {
            dbIamRoles[idx].account = accData.dataValues.id
             mcawsModels.AwsIamRole(process.env.DB_USERNAME,passwd.Plaintext.toString('ascii'),process.env.DB_HOST,'msaws', function(resp2) {
             resp2.create(roleData)
          })
         //if (con) con.end();
        }
        }
     })
      });
    });
  callback(null, event);
};
