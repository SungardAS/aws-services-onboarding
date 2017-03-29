
exports.handler = (event, context, callback) => {
  event.federation.roles = event.billing_master.roles;
  callback(null, event);
};
