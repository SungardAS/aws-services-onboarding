'use strict';

const AWS = require('aws-sdk');

exports.handler = function(event, context, callback) {
    /*************
    This lambda needs the following mandatory parameters in events:
        - accountTag
        - cloudCheckerSfArn
        - dbAwsAccount
            - awsid
            - name
    **************/

    // Initializations
    let stepfunctions = new AWS.StepFunctions();
    let cloudchecker_sf_arn = event.cloudCheckerSfArn;
    let acc_id = event.dbAwsAccount.awsid;
    let acc_name = event.dbAwsAccount.name;
    let execution_name = `CloudCheck-For-${acc_name}-${Date.now()}`;
    let execution_input = {
        accountTag: event.accountTag,
        customerAccountId: acc_id,
        customerAccountName: acc_name
    };
    let params = {
        stateMachineArn: cloudchecker_sf_arn,
        name: execution_name,
        input: JSON.stringify(execution_input)
    };

    // Start StateMachine Execution
    stepfunctions.startExecution(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        }
        else {
            console.log(data);           // successful response
        }
    });
    console.log('End of lambda');
    callback(null, event);
};
