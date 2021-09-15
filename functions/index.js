const functions = require("firebase-functions");

exports.setTimeLimit = functions.firestore.document("/meetings/{meetingId}")
    .onCreate((snapshot, context) => {
      functions.logger.log(context.params.meetingId);
    });
