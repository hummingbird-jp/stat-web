import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { doc, setDoc, collection, Timestamp } from "@firebase/firestore";

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

	const db = getFirestore();
	const dbRootRef = doc(db, 'meetings', meetingId);

	try {
		const docRef = await setDoc(dbRootRef, {
			lastTimeActive: Timestamp.now()
		});
		console.log("Firestore document for meetingId is set.");
	} catch (e) {
		console.error("Error adding document: ", e);
	}

	return { db: db, dbRootRef: dbRootRef };
}
