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
    //const con = mysql.createConnection({
    //  host: process.env.DB_HOST,
    //  user: process.env.DB_USERNAME,
    //  password: passwd.Plaintext.toString('ascii'),
    //  database: 'msaws'
    //});
    //con.connect(dberr => {
      mcawsModels.AwsAccount(process.env.DB_USERNAME,passwd.Plaintext.toString('ascii'),process.env.DB_HOST,'msaws', function(resp1) {
      resp1.create(dbAwsAccount)
      //if (dberr) throw dberr;
      //console.log('Connected!');
      //const sql1 = 'insert into awsaccount SET ?';
      //con.query(sql1, dbAwsAccount, (accErr, accData) => {
        //if (accErr) throw accErr;
        if (dbAwsAccount.account_type != 'craws') {
          for (let idx = 0; idx < dbIamRoles.length; idx++) {
            dbIamRoles[idx].account = accData.insertId;
            //const sql2 = 'insert into awsiamrole SET ?';
            //con.query(sql2, dbIamRoles[idx], (roleErr, roleData) => {
            //  console.log(roleErr);
            //  console.log(roleData);
            //});
             mcawsModels.AwsIamRole(process.env.DB_USERNAME,passwd.Plaintext.toString('ascii'),process.env.DB_HOST,'msaws', function(resp2) {
             resp2.create(roleData)
          })
         //if (con) con.end();
        }
        }
      });
    });
  //});
  callback(null, event);
};
