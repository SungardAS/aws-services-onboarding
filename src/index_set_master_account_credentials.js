
exports.handler = (event, context, callback) => {
  var credentials = {
    "AccessKeyId": event.credentials.Credentials.AccessKeyId,
    "SecretAccessKey": event.credentials.Credentials.SecretAccessKey,
    "SessionToken": event.credentials.Credentials.SessionToken
  }
  var codedCredentials = new Buffer(JSON.stringify(credentials)).toString('base64');
  event.account.headers.Credentials = codedCredentials;
  if (event.account.queryStringParameters.accountId) event.account.httpMethod = "GET";
  else event.account.httpMethod = "POST";
  callback(null, event);
};
