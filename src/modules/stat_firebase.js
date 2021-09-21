import * as app from "@firebase/app";
import * as firestore from "@firebase/firestore";
import * as functions from "firebase/functions";
import * as appCheck from "firebase/app-check";

export let db;
export let dbRootRef;
export const usersCollection = 'users';
export const timerCollection = 'timer';
export const agendasCollection = 'agenda';
export const bgmCollection = 'bgm';
export const audioSetCollection = 'audioSet';
export const talkDataCollection = 'talkData';
export const uriAudioDefault = 'https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2Fambient-1-dova-sjp-Everywhere_you_know.mp3?alt=media&token=fae5b477-8bc1-4884-bc06-41b79d49c96f';
export const firebaseApp = app.initializeApp({
	apiKey: "AIzaSyBq1wb-WlCSMH8cYeKvSWQlssMIk6z7b7Y",
	authDomain: "stat-web-6372a.firebaseapp.com",
	projectId: "stat-web-6372a",
	storageBucket: "stat-web-6372a.appspot.com",
	messagingSenderId: "1093597820985",
	appId: "1:1093597820985:web:ebd29201a74fea5acf35e8",
	measurementId: "G-ZWTBZRCXXE"
});

export function enableAppCheck() {
	appCheck.initializeAppCheck(firebaseApp, {
		// Don't worry, the site key is not a secret one
		provider: new appCheck.ReCaptchaV3Provider("6LehqH4cAAAAAKY9uptk5gtquoj72UMB0y0Tde_r"),
		isTokenAutoRefreshEnabled: true,
	});
}

// TODO: this should be distinguished between free account and pro.
export const extendLimitCollection = 'extendLimit';

export const functionsInstance = functions.getFunctions(firebaseApp);

export async function init(meetingId) {
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
