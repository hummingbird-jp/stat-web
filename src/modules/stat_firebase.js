import * as app from "@firebase/app";
import * as firestore from "@firebase/firestore";
import * as functions from "firebase/functions";
import * as stat_auth from "./stat_auth";
import * as appCheck from "firebase/app-check";

export let db;
export let dbRootRef;
export let meetingDocRef;
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
		provider: new appCheck.ReCaptchaV3Provider("6Lc7loAcAAAAAJftbQJ7z_8pE5RRPi3KHeyuXCxr"),
		isTokenAutoRefreshEnabled: true,
	});
}

// TODO: this should be distinguished between free account and pro.
export const extendLimitCollection = 'extendLimit';

export const functionsInstance = functions.getFunctions(firebaseApp);

export async function init() {
	db = firestore.getFirestore();
	dbRootRef = firestore.doc(db, 'channels', stat_auth.user.channel);

	try {
		const docRef = await firestore.getDoc(dbRootRef);
		if (docRef.data().latestMeetingId === null) {
			// If it is the first time to create a meeting in this channel,
			// latestMeetingId is initialized with null
			await createNewMeetingDocument()

		} else {
			// Already channel exists. Search for valid meeting
			const meetingsRef = firestore.collection(dbRootRef, 'meetings');
			const q = firestore.query(meetingsRef, firestore.orderBy("meetingLimitUntil", "desc"), firestore.limit(1));
			const querySnapshot = await firestore.getDocs(q);
			querySnapshot.forEach(async (doc) => {
				const now = firestore.Timestamp.now();

				if (doc.data().meetingLimitUntil < now) {
					console.log("There is no valid meeting ongoing. Creating new document...");
					await createNewMeetingDocument()

				} else {
					meetingDocRef = firestore.doc(dbRootRef, 'meetings', doc.id);
					console.log("Joining an ongoing meeting. ", doc.id);
				}
			})
		}
		console.log("Firestore document for meetingId is set.");
	} catch (e) {
		console.error("Error adding document: ", e);
	}
}

async function createNewMeetingDocument() {
	const docRef = await firestore.addDoc(firestore.collection(dbRootRef, 'meetings'), {
		lastTimeActive: firestore.Timestamp.now()
	});
	meetingDocRef = firestore.doc(dbRootRef, 'meetings', docRef.id);

	await firestore.updateDoc(dbRootRef, {
		lastTimeActive: firestore.Timestamp.now(),
		latestMeetingId: docRef.id,
	});

	await firestore.updateDoc(meetingDocRef, {
		lastTimeActive: firestore.Timestamp.now(),
	});
}
