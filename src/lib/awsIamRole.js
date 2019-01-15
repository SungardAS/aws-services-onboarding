var AWS = require('aws-sdk');
var querystring = require('querystring');

var findRole = function(iam, options, cb) {
  params = {
    RoleName: options.roleName
  };
  iam.getRole(params, function(err, data) {
    if (err) {
      createRole(iam, options, cb);
    }
    else {
      options.roleArn = data.Role.Arn;
      findRolePolicy(iam, options, cb);
    }
  });
}
/*
var deleteIAMRole = function(iam, options, cb) {
    var params = {
        RoleName: options.roleName,
        PolicyArn: sails.config.federate.aws.adminPolicyArn
    };
    iam.detachRolePolicy(params, function(err, data) {
        if (err) {
            console.log.error(err);
            return cb("Failed to delete the role : " + err);
        }
        delete params.PolicyArn;
        iam.deleteRole(params, function(err, data) {
            if (err) {
                console.log.error(err);
                return cb("Failed to delete the role : " + err);
            }
            cb(null, options);
        });
    });
}
*/
var createRole = function(iam, options, cb) {
  var extid = options.externalId;
  options.assumeRolePolicyDocument.Statement[0].Condition.StringEquals = {"sts:ExternalId": extid};
  var params = {
    AssumeRolePolicyDocument: JSON.stringify(options.assumeRolePolicyDocument),
    RoleName: options.roleName,
    Path: options.path
  };
  iam.createRole(params, function(err, data) {
    if (err) {
      return cb("Failed to create a role : " + err);
    }
    else {
      options.roleArn = data.Role.Arn;
      if (typeof options.policyDocument === 'undefined' || options.policyDocument === null) {
        attachRolePolicy(iam, options, cb);
      } else {
        addInlineRolePolicy(iam, options, cb);
      }
    }
  });
}

var findRolePolicy = function(iam, options, cb) {
  var params = {
    RoleName: options.roleName
  };
  iam.listRolePolicies(params, function(err, data) {
    if (err) {
      return cb("Failed to find a policy of the newly created role : " + err);
    }
    else {
      if (data.PolicyNames.lenth > 0 && data.PolicyNames[0] == options.policyArn) {
        if(options.onboardAccount){
          cb(null, options.roleArn);
        } else{
          getUser(iam, options, cb);
        }

      }
      else {
        attachRolePolicy(iam, options, cb);
      }
    }
  });
}

var attachRolePolicy = function(iam, options, cb) {
  var params = {
    PolicyArn: options.policyArn,
    RoleName: options.roleName
  };
  iam.attachRolePolicy(params, function(err, data) {
    if (err) {
      return cb("Failed to attach a policy to the newly created role : " + err);
    }
    else {
      if(options.onboardAccount){
        cb(null, options.roleArn);
      } else{
        getUser(iam, options, cb);
      }

    }
  });
}

var getUser = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  return iam.getUser(params, function(err, data) {
    if (err) {
      console.log(err);
      cb(null, options.roleArn);
    }
    else {
      listAccessKeys(iam, options, cb);
    }
  });
}

var listAccessKeys = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  iam.listAccessKeys(params, function(err, data) {
    if (err) {
      return cb("Failed to list access keys of the user : " + err);
    }
    else {
      console.log.info(data.AccessKeyMetadata);
      options.AccessKeyMetadata  = data.AccessKeyMetadata ;
      deleteAccessKeys(iam, options, cb);
    }
  });
}

var deleteAccessKeys = function(iam, options, cb) {
  if (options.AccessKeyMetadata.length > 0) {
    deleteAccessKey(iam, 0, options, cb);
  }
  else {
    listAttachedUserPolicies(iam, options, cb);
  }
}

var deleteAccessKey = function(iam, idx, options, cb) {
  var params = {
    AccessKeyId: options.AccessKeyMetadata[idx].AccessKeyId
  };
  iam.deleteAccessKey(params, function(err, data) {
    if (err) {
      return cb("Failed to detach an access key from the user : " + err);
    }
    else {
      idx++;
      if(idx < options.AccessKeyMetadata.length) {
        deleteAccessKey(iam, idx, options, cb);
      }
      else {
        listAttachedUserPolicies(iam, options, cb);
      }
    }
  });
}

var listAttachedUserPolicies = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  iam.listAttachedUserPolicies(params, function(err, data) {
    if (err) {
      return cb("Failed to list policies of the user : " + err);
    }
    else {
      console.log.info(data.AttachedPolicies);
      options.AttachedPolicies = data.AttachedPolicies;
      detachUserPolicies(iam, options, cb);
    }
  });
}

var detachUserPolicies = function(iam, options, cb) {
  if (options.AttachedPolicies.length > 0) {
    detachUserPolicy(iam, 0, options, cb);
  }
  else {
    getLoginProfile(iam, options, cb);
  }
}

var detachUserPolicy = function(iam, idx, options, cb) {
  var params = {
    PolicyArn: options.AttachedPolicies[idx].PolicyArn,
    UserName: options.userName
  };
  iam.detachUserPolicy(params, function(err, data) {
    if (err) {
      return cb("Failed to detach a policy from the user : " + err);
    }
    else {
      idx++;
      if(idx < options.AttachedPolicies.length) {
        detachUserPolicy(iam, idx, options, cb);
      }
      else {
        getLoginProfile(iam, options, cb);
      }
    }
  });
}

var getLoginProfile = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  iam.getLoginProfile(params, function(err, data) {
    if (err) {
      deleteUser(iam, options, cb);
    }
    else {
      deleteLoginProfile(iam, options, cb);
    }
  });
}

var deleteLoginProfile = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  iam.deleteLoginProfile(params, function(err, data) {
    if (err) {
      return cb("Failed to delete the user profile : " + err);
    }
    else {
      deleteUser(iam, options, cb);
    }
  });
}

var deleteUser = function(iam, options, cb) {
  var params = {
    UserName: options.userName
  };
  iam.deleteUser(params, function(err, data) {
    if (err) {
      return cb("Failed to delete the user : " + err);
    }
    else {
      cb(null, options.roleArn);
    }
  });
}

var addInlineRolePolicy = function(iam, options, cb) {
    if (typeof options.policyDocument === 'undefined' || options.policyDocument === null) {
      policy = {
          Version: "2012-10-17",
          Statement:{
              Effect: "Allow",
              Resource: options.bucketArn,
              Action: [
                  "s3:PutObject",
                  "s3:GetObject"
              ]
          }
      }
    
      var params = {
          PolicyName: "S3AccessPolicy-"+ options.account,
          RoleName: options.roleName,
          PolicyDocument: JSON.stringify(policy)
      };
    } else {
      var params = {
          PolicyName: options.roleName+"Policy",
          RoleName: options.roleName,
          PolicyDocument: JSON.stringify(options.policyDocument)
      };
    }
    iam.putRolePolicy(params, function(err, data) {
        if (err) {
            return cb("Failed to add inline policy to role "+ options.roleName +" : " + err);
        }
        else {
            cb(null, options.roleArn);
        }
    });
}

var listServerCertificates = function(iam, options, cb) {
  params = {
//    RoleName: options.roleName
  };
  iam.listServerCertificates(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
	return cb("Failed to List Server Certificates : " + err);
    }
    else {
	cb(null,data);
    }
  });
}

var uploadServerCertificates = function(iam, options, cb) {
  params = {
  	CertificateBody:options.CertBody,
	Path: "/",
	PrivateKey:options.PrivateKey,
	CertificateChain: options.CertChain,
	ServerCertificateName: options.CertName
  };
  iam.uploadServerCertificate(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
        return cb("Failed to Upload Server Certificates : " + err);
    }
    else {
        cb(null,data);
/*
   data = {
    ServerCertificateMetadata: {
     Arn: "arn:aws:iam::123456789012:server-certificate/company/servercerts/ProdServerCert",
     Expiration: <Date Representation>,
     Path: "/company/servercerts/",
     ServerCertificateId: "ASCA1111111111EXAMPLE",
     ServerCertificateName: "ProdServerCert",
     UploadDate: <Date Representation>
    }
   }
   */
    }
  });
}


var createAdminRole = function(iam, options, cb) {
  //options.assumeRolePolicyDocument = sails.config.federate.aws.assumeRolePolicyDocument;
  //options.assumeRolePolicyDocument.Statement[0].Principal.AWS = sails.config.federate.aws.roleArn;
  options.assumeRolePolicyDocument = options.config.federate.aws.assumeRolePolicyDocument;
  options.assumeRolePolicyDocument.Statement[0].Principal.AWS = sails.config.federate.aws.roleArn;
  return findRole(iam, options, cb);
}

var updateRoleTrustRelationship = function(iam, options, cb) {
    var params = {
        RoleName: options.roleName
    };
    var addStatement = true;

    var logGroupAccessPolicy = {
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Principal": {
            "Service": "vpc-flow-logs.amazonaws.com"
        },
        "Sid": "VPCFlowLogs"
    };

    iam.getRole(params, function(err, iamrole) {
        if (err) {
            console.log.error("Role not found", err);
            return cb("Role not found, try adding manually", null);
        }
        else {
            var assumePolicy = iamrole.Role.AssumeRolePolicyDocument,
                policy = JSON.parse(querystring.unescape(assumePolicy)),
                statements = policy.Statement;

            for(var i in statements){
                if (statements[i].Sid ==  "VPCFlowLogs") {
                    addStatement = false;
                }
            }
            if(addStatement) statements.push(logGroupAccessPolicy);
            params.PolicyDocument = JSON.stringify(policy);
            console.log.debug(params.PolicyDocument);
            iam.updateAssumeRolePolicy(params, function(err, data){
                if(err){
                    console.log.error("Role not found", err);
                    return cb("Policy trust relationship not modified", null);
                }else{
                    console.log.debug("Trust relationship modified", data);
                    return cb(null, "Trust relationship updated");
                }
            });
        }
    });
}

var IAMService = function() {

};

IAMService.prototype.createRole = function(options,cb) {
  /*var options = {
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    sessionToken: 'sessionToken',
    roleName: 'roleName',
    path: 'path',
    externalId: 'externalId',
    //userName: 'userName'
  };*/

  var params = {};
  var creds = new AWS.Credentials({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
    sessionToken: options.sessionToken
  });
  params.credentials = creds;
  var iam = new AWS.IAM(params);

  //return createAdminRole(iam, options, cb);
  return findRole(iam, options, cb)
};

IAMService.prototype.deleteIAMRole = function(options,cb) {
    console.log.info("deleteRole options=" + JSON.stringify(options));

    var params = {};
    var creds = new AWS.Credentials({
        accessKeyId: options.credentials.AccessKeyId,
        secretAccessKey: options.credentials.SecretAccessKey,
        sessionToken: options.credentials.SessionToken
    });
    params.credentials = creds;
    var iam = new AWS.IAM(params);
    return deleteIAMRole(iam, options, cb);
};

IAMService.prototype.addInlineRolePolicy = function(options,cb) {
    var iam = new AWS.IAM();
    return addInlineRolePolicy(iam, options, cb);
};

IAMService.prototype.listServerCertificates = function(options,cb) {
    console.log.info("listServerCertificates options=" + JSON.stringify(options));

    var params = {};
    var creds = new AWS.Credentials({
        accessKeyId: options.credentials.AccessKeyId,
        secretAccessKey: options.credentials.SecretAccessKey,
        sessionToken: options.credentials.SessionToken
    });
    params.credentials = creds;
    var iam = new AWS.IAM(params);
    return listServerCertificates(iam, options, cb);
};

IAMService.prototype.uploadServerCertificates = function(options,cb) {
    console.log.info("Upload Server Certificates options=" + JSON.stringify(options));

    var params = {};
    var creds = new AWS.Credentials({
        accessKeyId: options.credentials.AccessKeyId,
        secretAccessKey: options.credentials.SecretAccessKey,
        sessionToken: options.credentials.SessionToken
    });
    params.credentials = creds;
    var iam = new AWS.IAM(params);
    return uploadServerCertificates(iam, options, cb);
};

IAMService.prototype.updateRoleTrustRelationship = function(options,cb) {
    console.log.info("updateRoleTrustRelationship options=" + JSON.stringify(options));

    var params = {};
    if(options.credentials){
        var creds = new AWS.Credentials({
            accessKeyId: options.credentials.AccessKeyId,
            secretAccessKey: options.credentials.SecretAccessKey,
            sessionToken: options.credentials.SessionToken
        });
        params.credentials = creds;
    }
    var iam = new AWS.IAM(params);
    return updateRoleTrustRelationship(iam, options, cb);
};

module.exports = new IAMService();
