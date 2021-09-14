import * as firestore from "@firebase/firestore";

import * as _ from "../index";
import * as firebase from "./firebase";

// Send agenda to Firestore
export async function sendAgenda(agenda) {
	const collectionRef = firestore.collection(firebase.statFirestore.dbRootRef, firebase.statFirestore.agendasCollection);

	// addDoc instead of setDoc, because no need to specify doc ID
	await firestore.addDoc(collectionRef, {
		agenda: agenda,
		timeSet: firestore.Timestamp.now(),
		setBy: _.options.userName,
	}).then((result) => {
		console.log(`Agenda successfully sent! ${result}`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});

}

export function listenAgenda() {
	const unsub = firestore.onSnapshot(firestore.collection(firebase.statFirestore.dbRootRef, firebase.statFirestore.agendasCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const newAgenda = change.doc.data().agenda;
				$('#agenda-out').text(newAgenda);
			}
		})
	});
}
