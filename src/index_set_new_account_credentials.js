
exports.handler = (event, context, callback) => {
  var credentials = {
    "AccessKeyId": event.credentials.Credentials.AccessKeyId,
    "SecretAccessKey": event.credentials.Credentials.SecretAccessKey,
    "SessionToken": event.credentials.Credentials.SessionToken
  }
  event.health.credentials = credentials;

  var codedCredentials = new Buffer(JSON.stringify(credentials)).toString('base64');
  event.cloudtrail.headers.Credentials = codedCredentials;
  event.awsconfig.headers.Credentials = codedCredentials;
  event.configrules.headers.Credentials = codedCredentials;

  console.log(codedCredentials);
  console.log(event);

  callback(null, event);
};
