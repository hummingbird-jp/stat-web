const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { RtcRole, RtcTokenBuilder } = require('agora-access-token');
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

exports.generateTokenWithUid = functions.region("us-central1").https.onCall((data, context) => {
	// Rtc Examples
	const appID = 'adaa9fb7675e4ca19ca80a6762e44dd2';
	const appCertificate = '2fa47b6819414439a09915f8f46fb6bd';
	const channelName = data.channelName;
	const uid = context.auth.uid;
	const role = RtcRole.PUBLISHER;
	const expirationTimeInSeconds = 3600
	const currentTimestamp = Math.floor(Date.now() / 1000)
	const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

	// Build token with uid
	try {
		const token = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
		functions.logger.debug(`Token generated with UID: ${token}`);
		return { token: token };
	} catch (error) {
		functions.logger.error(`Error generating token: ${error}`);
		// Checking attribute.
		if (!(typeof channelName === 'string') || channelName.length === 0) {
			// Throwing an HttpsError so that the client gets the error details.
			throw new functions.https.HttpsError('invalid-argument', 'The function must be called with ' +
				'one arguments "text" containing the message text to add.');
		}
		// Checking that the user is authenticated.
		if (!context.auth) {
			// Throwing an HttpsError so that the client gets the error details.
			throw new functions.https.HttpsError('failed-precondition', 'The function must be called ' +
				'while authenticated.');
		}
	}
});
