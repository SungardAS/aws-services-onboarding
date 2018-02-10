const mysql = require('mysql');

exports.handler = function(event, context, callback) {
  console.log(JSON.stringify(event));
  const dbIamRoles = event.dbIamRoles;
  const dbAwsAccount = event.dbAwsAccount;

  const con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: 'msaws'
  });
  con.connect(err => {
    if (err) throw err;
    console.log('Connected!');
    const sql1 = 'insert into awsaccount SET ?';
    con.query(sql1, dbAwsAccount, (accErr, accData) => {
      if (accErr) throw accErr;
      if (dbAwsAccount.account_type != 'craws') {
        for (let idx = 0; idx < dbIamRoles.length; idx++) {
          dbIamRoles[idx].account = accData.insertId;
          const sql2 = 'insert into awsiamrole SET ?';
          con.query(sql2, dbIamRoles[idx], (roleErr, roleData) => {
            console.log(roleErr);
            console.log(roleData);
          });
        }
      }
    });
  });
  if (con) con.end();
  callback(null, event);
};
