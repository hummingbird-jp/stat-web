import { doc, collection, setDoc, onSnapshot, Timestamp } from "@firebase/firestore";

// Send agenda to Firestore
export function sendAgenda(dbRootRef, agenda, userName) {

	dbRootRef.collection(agendasCollection).add({
		agenda: agenda,
		timeSet: firebase.firestore.Timestamp.now(),
		setBy: userName
	}).then(() => {
		console.log(`Agenda successfully sent!`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});
}

// Listen to sync-agenda-beta collection; code below will be run
// when something has changed on Firestore > "agendas"
export function listenAgenda(statFirestore) {
	const unsub = onSnapshot(collection(statFirestore.dbRootRef, statFirestore.agendasCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const newAgenda = change.doc.data().agenda;
				$('#agenda-out').text(newAgenda);
			}
		})
	});
}
