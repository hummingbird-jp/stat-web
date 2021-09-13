import { initializeApp } from "@firebase/app";
import { getFirestore } from "@firebase/firestore";
import { doc, addDoc, Timestamp } from "@firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyBq1wb-WlCSMH8cYeKvSWQlssMIk6z7b7Y",
	authDomain: "stat-web-6372a.firebaseapp.com",
	projectId: "stat-web-6372a",
	storageBucket: "stat-web-6372a.appspot.com",
	messagingSenderId: "1093597820985",
	appId: "1:1093597820985:web:ebd29201a74fea5acf35e8",
	measurementId: "G-ZWTBZRCXXE"
};

//export function initFirestore(meetingId) {
//	firebase.initializeApp(firebaseConfig);
//	firebase.analytics();

//	const db = firebase.firestore();
//	const dbRootRef = db.collection("meetings").doc(meetingId);

//	dbRootRef.set({
//		lastTimeActive: firebase.firestore.Timestamp.now()
//	})

//	return [db, dbRootRef];
//}

export async function initFirestore(myFirestore, meetingId) {
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

	myFirestore.db = db;
	myFirestore.dbRootRef = doc(db, 'meetings', meetingId);

	try {
		const docRef = await addDoc(myFirestore.dbRootRef, {
			lastTimeActive: Timestamp.now()
		});
		console.log("Document written with ID: ", docRef.id);
	} catch (e) {
		console.error("Error adding document: ", e);
	}
	//await setDoc(myFirestore.dbRootRef)
	//myFirestore.dbRootRef.set({
	//	lastTimeActive: Timestamp.now()
	//})

	//return myFirestore;
}
