import * as firestore from "@firebase/firestore";

import * as _ from "../index";
import * as stat_auth from "./stat_auth";
import * as stat_firebase from "./stat_firebase";

// Send agenda to Firestore
export async function sendAgenda(agenda) {
	const collectionRef = firestore.collection(stat_firebase.meetingDocRef, stat_firebase.agendasCollection);

	// addDoc instead of setDoc, because no need to specify doc ID
	await firestore.addDoc(collectionRef, {
		agenda: agenda,
		timeSet: firestore.Timestamp.now(),
		setBy: stat_auth.user.displayNameStat,
	}).then(() => {
		console.log(`Agenda successfully sent! ${agenda}`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});

}

export function listenAgenda() {
	const unsub = firestore.onSnapshot(firestore.collection(stat_firebase.meetingDocRef, stat_firebase.agendasCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const newAgenda = change.doc.data().agenda;
				$('#agenda-out').text(newAgenda);
			}
		})
	});
}
