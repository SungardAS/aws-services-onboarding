'use strict';

const AWS = require('aws-sdk');
const McawsModels = require('./models/mcawsModels.js');

exports.handler = function(event, context, callback) {
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
    mcawsDbObj.AwsAccount(accResp => {
      accResp.sync().then(() =>
        accResp.findAll({
			where: dbAwsAccount
		}).then(resultData => {
			if (resultData.length >= 1) throw "Already data present in database, skipping insert.";
			else return true;
		}).then(() =>
		accResp
          .create(dbAwsAccount))
          .then(accData => {
            if (dbAwsAccount.account_type.toLowerCase() != 'craws') {
              for (let idx = 0; idx < dbIamRoles.length; idx++) {
                dbIamRoles[idx].account = accData.dataValues.id;
                mcawsDbObj.AwsIamRole(iamResp =>
                  iamResp
                    .create(dbIamRoles[idx])
                    .then(roleData => {
                      console.log('role updation Done :)');
                      console.log(roleData);
                      if (idx == dbIamRoles.length - 1) mcawsDbObj.CloseConnection();
                    })
                    .catch(errRole => console.log(errRole))
                );
              }
            } else {
              mcawsDbObj.CloseConnection();
            }
          })
          .catch(errAcc => console.log(errAcc))
      );
    });
  });
  callback(null, event);
};
