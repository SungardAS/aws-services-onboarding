
var fs = require('fs');
var AWS = require('aws-sdk');
var mysql = require('mysql');
var sleep = require('sleep');

var baseHandler = require('aws-services-lib/lambda/base_handler.js')

function getRulesPayload(ruleFunctionName, cb){
    sails.models.configdefinition.findOne({name: ruleFunctionName}).populateAll().exec(function(err, rule) {
       payload_json ={};
       if (err) cb(false, err);
       else{
          var rule_1 = JSON.parse(JSON.stringify(rule));
          payload_json.ruleFunctionName = ruleFunctionName;
          payload_json.owner = rule_1.owner;
          payload_json.resourceType = [];
          payload_json.sourceID = rule_1.sourceID;
          payload_json.desc = rule_1.description;
          var types = rule_1.resourceTypes;
          if(!types) reject(Error("ResourceTypes not found, check database"));
          for( var idx=0 ; idx < types.length ; idx++ ){
             payload_json.resourceType.push( types[idx].name);
          }
          if (rule_1.owner == "CUSTOM_LAMBDA"){
            payload_json.masterAccount = sails.config.federate.aws.masterAWSAccount;
            payload_json.functionName = rule_1.sourceID;
            payload_json.principal = "config.amazonaws.com";
            payload_json.action = "lambda:*";
            payload_json.statementId = uuid.v4();
            payload_json.messageType = "ConfigurationItemChangeNotification";
          }
          sails.log.info("************************getRules**********************");
          sails.log.info(payload_json);
          cb(true, payload_json);
       }
    });
}


exports.handler = (event, context) => {
  baseHandler.handler(event, context);
}

baseHandler.get = function(params, callback) {
  
  var stepfunctions = new AWS.StepFunctions({region: process.env.AWS_DEFAULT_REGION});
  var input = {
    executionArn: params.executionArn
  };
  stepfunctions.describeExecution(input, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      callback(err);
    }
    else {
      console.log(data);
      // {"executionArn":"arn:aws:states:us-east-1:1111:execution:machine_name:12345678-1234-1234-1234-123456789012",
      //  "stateMachineArn":"arn:aws:states:us-east-1:1111:stateMachine:machine_name",
      //  "name":"12345678-1234-1234-1234-123456789012",
      //  "status":"SUCCEEDED",
      //  "startDate":"2017-02-12T02:12:07.464Z",
      //  "stopDate":"2017-02-12T02:12:45.911Z",
      //  "input":"{\"federation\":{\"roles\":[{\"roleArn\":\"arn:aws:iam::089476....."}",
      //  "output":"{\"results\":{\"cloudtrail\":[{\"result\":true,\"....-west-2\"}]}}"}
      callback(null, data);
    }
  });
};

baseHandler.post = function(params, callback) {

  var stepfunctions = new AWS.StepFunctions({region: process.env.AWS_DEFAULT_REGION});

  var inputDoc = JSON.parse(fs.readFileSync(__dirname + '/json/state_machine_input.json', {encoding:'utf8'}));
  var ruleFunctionNames = JSON.parse(fs.readFileSync(__dirname + '/json/default_config_rules.json', {encoding:'utf8'}));
  

  console.log(ruleFunctionNames);

  var account = {
     "id": params.account,
     "name": params.awsname,
     "desc": params.awsdesc,
     "email": params.email,
     "type": params.account_type.toLowerCase(),
     "masterAwsId": params.masterBillingAWSAccount,
     "OfferingNum": params.offeringNum,
     "SGID": params.sgid,
     "guid": params.companyguid
  }
  inputDoc.account.billingDetails = account;
  if (account.id) {
    inputDoc.account.httpMethod = "GET";
    inputDoc.account.queryStringParameters.accountId = account.id;
  }
  else {
    inputDoc.account.httpMethod = "POST";
    inputDoc.account.body = account;
  }
  inputDoc.federation.authorizer_user_guid = params.userGuid;

  var masterBillingRoleArn = "arn:aws:iam::" + params.masterBillingAWSAccount + ":role/" + process.env.ADMIN_ROLE_NAME;
  const encryptedBuf = new Buffer(process.env.DB_PASSWORD, 'base64');
  const cipherText = { CiphertextBlob: encryptedBuf };
  const kms = new AWS.KMS({region:process.env.KMS_REGION});
  Promise.all(ruleFunctionNames.map(getRules)).then(function(configrules){
  cosnole.log(configrules);
  inputDoc.configrules.rules = configrules;
  kms.decrypt(cipherText, (err, passwd) => {
    if (err) {
      console.log('Decrypt error:', err);
      return callback(err);
    } else {
      console.log('Decrypt passwd:');
      console.log(passwd.Plaintext.toString('ascii'));
      console.log(process.env.DB_HOST);
      console.log(process.env.DB_USERNAME);
      console.log(masterBillingRoleArn);
      var con = mysql.createConnection({host: process.env.DB_HOST,user: process.env.DB_USERNAME,password: passwd.Plaintext.toString('ascii'), database:'msaws'});
      con.connect(function(err) {
        if (err) throw err;
          console.log("Connected!");
          const sql = "select * from awsiamrole where arn='"+masterBillingRoleArn+"'";
          con.query(sql, function (err, data) {
            if (err) throw err;
            console.log("Result: " + data);
            inputDoc.billing_master.roles = [{"roleArn": "arn:aws:iam::"+process.env.MASTER_MGM_AWS_ID+":role/federate"},{"roleArn": masterBillingRoleArn, "externalId": data[0].externalId}]
            if(account.type.toLowerCase() != 'craws')
            {
              inputDoc.configrules.rules = [];
              inputDoc.configrules.customerAccount = params.account.id;
              inputDoc.health.cloudformationLambdaExecutionRole = process.env.CFN_LAMBDA_EXEC_ROLE
              inputDoc.health.codePipelineServiceRole = process.env.CODE_PIPELINE_SERVICE_ROLE
              inputDoc.health.gitHubPersonalAccessToken = process.env.GIT_HUB_ACCESS_TOKEN
              inputDoc.health.subscriptionFilterDestinationArn = process.env.SUBSC_FILTER_DEST
              var input = {
                stateMachineArn: process.env.STATE_MACHINE_ARN,
                input: JSON.stringify(inputDoc)
              };
            } else {
              var input = {
                stateMachineArn: process.env.STATE_MACHINE_FOR_UNMANAGED_ACCOUNT_ARN,
                input: JSON.stringify(inputDoc)
              };
            }
            console.log("======INPUT=====");
            console.log(input);
            input.name = "New-Account-Setup-For-" + params.awsname.replace(/ /g, '-')
            stepfunctions.startExecution(input, function(err, data) {
              if (err) {
                console.log(err, err.stack);
                callback(err);
              }
              else {
                console.log(data);
                callback(null, data);
              }
            });
          });
          if(con) con.end()
      });
    }
  })
  })
};
