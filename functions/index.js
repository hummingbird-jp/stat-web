const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setTimeLimit = functions.firestore.document("/meetings/{meetingId}")
    .onCreate((snapshot, context) => {
        functions.logger.log(context.params.meetingId);

        const date = new Date();
        const duration = 40 * 60 * 1000; // Add 40 minutes to limit
        const limit = new Date(date.getTime() + duration);

        return snapshot.ref.set({
            meetingStartedAt: admin.firestore.Timestamp.fromDate(date),
            meetingLimitUntil: admin.firestore.Timestamp.fromDate(limit)
        }, { merge: true });
    });

exports.extendTimeLimit = functions.firestore
    .document("/meetings/{meetingId}/extendLimit/{docId}")
    .onWrite((change, context) => {
        const meetingId = context.params.meetingId;

        const date = new Date();
        const duration = 40 * 60 * 1000; // Add 40 minutes to limit
        const limit = new Date(date.getTime() + duration);

        admin.firestore().doc(`meetings/${meetingId}`).set({
            lastTimeActive: admin.firestore.Timestamp.fromDate(date),
            meetingLimitUntil: admin.firestore.Timestamp.fromDate(limit)
        }, { merge: true });
    });
