const Sequelize = require('sequelize');

function getDbOrmObj(user, passwd, host, dbname){
  console.log(user, passwd, host, dbname)
  const dbObj = new Sequelize(dbname, user, passwd, {host: host, dialect:'mysql'})
  return dbObj;
}


var mcawsModels = function() {

};

mcawsModels.prototype.AwsAccount = function(user, passwd, host, dbname, cb) {
  var sequelize = getDbOrmObj(user, passwd, host, dbname);
  const AwsAccount = sequelize.define('awsaccount',
  { 
     name: {type: Sequelize.STRING},
     awsid: {type: Sequelize.STRING},
     description: {type: Sequelize.STRING},
     email: {type: Sequelize.STRING},
     company_guid: {type: Sequelize.STRING},
     account_type: {type: Sequelize.STRING}
  },  
  {freezeTableName: true});
  cb(AwsAccount)
};

mcawsModels.prototype.AwsIamRole = function(user, passwd, host, dbname, cb) {
  var sequelize = getDbOrmObj(user, passwd, host, dbname);
  const AwsIamRole = sequelize.define('awsiamrole',
   {
      arn: {type: Sequelize.STRING},
      name: {type: Sequelize.STRING},
      path: {type: Sequelize.STRING},
      externalId: {type: Sequelize.STRING},
      account: {type: Sequelize.INTEGER}
   },
   {freezeTableName: true});
  cb(AwsIamRole)
};

module.exports = new mcawsModels();

