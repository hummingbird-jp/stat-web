import { statFirestore } from "./firebase";
import { doc, collection, addDoc, onSnapshot, Timestamp } from "@firebase/firestore";
import { options } from "../index";

// Send agenda to Firestore
export async function sendAgenda(agenda) {
	const collectionRef = collection(statFirestore.dbRootRef, statFirestore.agendasCollection);

	// addDoc instead of setDoc, because no need to specify doc ID
	await addDoc(collectionRef, {
		agenda: agenda,
		timeSet: Timestamp.now(),
		setBy: options.userName,
	}).then((result) => {
		console.log(`Agenda successfully sent! ${result}`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});

}

export function listenAgenda() {
	const unsub = onSnapshot(collection(statFirestore.dbRootRef, statFirestore.agendasCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const newAgenda = change.doc.data().agenda;
				$('#agenda-out').text(newAgenda);
			}
		})
	});
}
