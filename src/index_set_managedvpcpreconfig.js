'use strict';

const aws = require('aws-sdk');

var s3bucket = new (require('aws-services-lib/aws/s3bucket.js'))();

exports.handler = (event, context, callback) => {
  console.log("Test");
  console.log(event);
  console.log("Test2");
};
