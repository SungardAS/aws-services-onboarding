const Sequelize = require('sequelize');

function getDbOrmObj(user, passwd, host, dbname){
  console.log(user, passwd, host, dbname)
  const dbObj = new Sequelize(dbname, user, passwd, { 
    host: host, 
    dialect:'mysql',
    pool: {
     max: 5,
     min: 0,
     idle: 5000
    }
   });
  return dbObj;
}


var mcawsModels = function(user, passwd, host, dbname) {
  this.sequelize = getDbOrmObj(user, passwd, host, dbname);

};

mcawsModels.prototype.AwsAccount = function(cb) {
  const AwsAccount = this.sequelize.define('awsaccount',
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

mcawsModels.prototype.AwsIamRole = function(cb) {
  const AwsIamRole = this.sequelize.define('awsiamrole',
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

module.exports = mcawsModels;

