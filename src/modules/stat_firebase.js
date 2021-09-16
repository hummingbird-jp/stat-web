import * as app from "@firebase/app";
import * as firestore from "@firebase/firestore";

export let db;
export let dbRootRef;
export const usersCollection = 'users';
export const timerCollection = 'timer';
export const agendasCollection = 'agenda';
export const bgmCollection = 'bgm';
export const audioSetCollection = 'audioSet';
export const talkDataCollection = 'talkData';
export const uriAudioDefault = 'https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2Fnature_sound.mp3?alt=media&token=aff3df2f-787d-43e6-be5f-2a51cae2abef';
export const firebaseApp = app.initializeApp({
	apiKey: "AIzaSyBq1wb-WlCSMH8cYeKvSWQlssMIk6z7b7Y",
	authDomain: "stat-web-6372a.firebaseapp.com",
	projectId: "stat-web-6372a",
	storageBucket: "stat-web-6372a.appspot.com",
	messagingSenderId: "1093597820985",
	appId: "1:1093597820985:web:ebd29201a74fea5acf35e8",
	measurementId: "G-ZWTBZRCXXE"
});

// TODO: this should be distinguished between free account and pro.
export const extendLimitCollection = 'extendLimit';

export async function initFirestore(meetingId) {
	db = firestore.getFirestore();
	dbRootRef = firestore.doc(db, 'meetings', meetingId);

	try {
		const docRef = await firestore.getDoc(dbRootRef);
		if (!docRef.exists()) {
			// If it is the first time to initialize this document
			firestore.setDoc(dbRootRef, {
				lastTimeActive: firestore.Timestamp.now(),
			});

		} else {
			firestore.updateDoc(dbRootRef, {
				lastTimeActive: firestore.Timestamp.now()
			});
		}
		console.log("Firestore document for meetingId is set.");
	} catch (e) {
		console.error("Error adding document: ", e);
	}
}
