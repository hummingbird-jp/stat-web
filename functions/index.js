const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setTimeLimit = functions.firestore.document("/meetings/{meetingId}")
	.onCreate((snapshot, context) => {
		functions.logger.log(context.params.meetingId);

		const nowMillis = admin.firestore.Timestamp.now().toMillis();
		const durationMillis = 40 * 60 * 1000; // 40 minutes
		const limit = nowMillis + durationMillis;

		return snapshot.ref.set({
			meetingStartedAt: admin.firestore.Timestamp.fromMillis(nowMillis),
			meetingLimitUntil: admin.firestore.Timestamp.fromMillis(limit)
		}, { merge: true });
	});

exports.extendTimeLimit = functions.firestore
	.document("/meetings/{meetingId}/extendLimit/{docId}")
	.onWrite(async (change, context) => {
		const meetingId = context.params.meetingId;
		const docRef = admin.firestore().doc(`meetings/${meetingId}`);
		const docSnapshot = await docRef.get()

		if (docSnapshot.exists) {

			const currentLimitMillis = docSnapshot.data().meetingLimitUntil.toMillis();
			const durationMillis = 40 * 60 * 1000; // 40 minutes
			const limit = currentLimitMillis + durationMillis;

			admin.firestore().doc(`meetings/${meetingId}`).set({
				lastTimeActive: admin.firestore.Timestamp.now(),
				meetingLimitUntil: admin.firestore.Timestamp.fromMillis(limit)
			}, { merge: true });
		} else {
			functions.logger.log("Error extending meeting limit. Check if document exists.")
		}

	});
