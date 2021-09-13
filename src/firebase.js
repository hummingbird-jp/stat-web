import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { doc, setDoc, collection, Timestamp } from "@firebase/firestore";

export const statFirestore = {
	db: null,
	dbRootRef: null,
	usersCollection: 'users',
	timerCollection: 'timer',
	agendasCollection: 'agenda',
	bmgCollection: 'bgm',
	audioSetCollection: 'audioSet',
	talkDataCollection: 'talkData',
	uriAudioDefault: 'https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2Fnature_sound.mp3?alt=media&token=aff3df2f-787d-43e6-be5f-2a51cae2abef',
};

export async function initFirestore(meetingId) {
	const firebaseApp = initializeApp({
		apiKey: "AIzaSyBq1wb-WlCSMH8cYeKvSWQlssMIk6z7b7Y",
		authDomain: "stat-web-6372a.firebaseapp.com",
		projectId: "stat-web-6372a",
		storageBucket: "stat-web-6372a.appspot.com",
		messagingSenderId: "1093597820985",
		appId: "1:1093597820985:web:ebd29201a74fea5acf35e8",
		measurementId: "G-ZWTBZRCXXE"
	});

	statFirestore.db = getFirestore();
	statFirestore.dbRootRef = doc(statFirestore.db, 'meetings', meetingId);

	try {
		const docRef = await setDoc(statFirestore.dbRootRef, {
			lastTimeActive: Timestamp.now()
		});
		console.log("Firestore document for meetingId is set.");
	} catch (e) {
		console.error("Error adding document: ", e);
	}
}
