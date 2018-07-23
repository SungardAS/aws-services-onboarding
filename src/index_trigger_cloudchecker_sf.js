'use strict';

var AWS = require('aws-sdk');

exports.handler = function(event, context, callback) {
    /*************
    This lambda needs the following mandatory parameters in events:
        - cloudCheckerSfArn
        - dbAwsAccount
            - awsid
            - name
    **************/

    // Initializations
    var stepfunctions = new AWS.StepFunctions();
    var cloudchecker_sf_arn = event.cloudCheckerSfArn;
    var acc_id = event.dbAwsAccount.awsid;
    var acc_name = event.dbAwsAccount.name;
    var execution_name = `CloudCheck-For-${acc_name}-${Date.now()}`;
    var execution_input = {
        accountTag: event.accountTag,
        customerAccountId: acc_id,
        customerAccountName: acc_name
    }
    var params = {
        stateMachineArn: cldchk_stpfn_arn,
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
};
