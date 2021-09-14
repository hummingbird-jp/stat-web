import { doc, collection, setDoc, getDoc, updateDoc, onSnapshot, Timestamp } from "@firebase/firestore";
import { statFirestore } from "./firebase";
import { options } from "..";

export async function addMyUserInfo() {

	const docRef = doc(statFirestore.dbRootRef, statFirestore.usersCollection, options.uid.toString());

	await setDoc(docRef, {
		uid: options.uid,
		userName: options.userName,
		timeJoined: Timestamp.now(),
		isActive: true,
		reaction: "😀"
	}).then((result) => {
		console.log(`Successfully sent user data. ${result}`);
	}).catch((err) => {
		console.error(`Error sending user data: ${err}`);
	});
}

export async function listenUserInfo() {
	const unsub = onSnapshot(collection(statFirestore.dbRootRef, statFirestore.usersCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			const uid = change.doc.data().uid;
			const userName = change.doc.data().userName;
			const reaction = change.doc.data().reaction;

			if (change.type === "added") {
				$(`#player-wrapper-${uid}`).children('.player-name').text(userName);
			}

			if (change.type === "modified") {

				// Listen to reaction change
				const currentUserReaction = $(`#player-reaction-${uid}`).text();
				if (reaction != currentUserReaction) {

					$(`#player-reaction-${uid}`).text(reaction);

				} else {

					const isActive = change.doc.data().isActive;
					if (isActive) {
						// userName changed
						const uid = change.doc.data().uid;
						const userName = change.doc.data().userName;
						$(`#player-wrapper-${uid}`).children('.player-name').text(userName);
					}
					// If user deactivated, it will be automatically updated.
					updateTalkBar();
				}
			}
		});
	});

	$("#local-player-name").on('click', async function () {
		const oldUserName = options.userName;
		let newUserName = prompt("Please enter your name:", oldUserName);
		if (newUserName == null || newUserName == "") {
			newUserName = oldUserName;
		} else {
			const docRef = doc(statFirestore.dbRootRef, statFirestore.usersCollection, options.uid.toString());
			const updateUserName = await updateDoc(docRef, {
				userName: newUserName
			});
		}
		options.userName = newUserName;
		$("#local-player-name").text(`${newUserName} (You)`);
	});
}

export async function deactivateMe() {
	const docRef = doc(statFirestore.dbRootRef, statFirestore.usersCollection, options.uid.toString());
	const docSnap = await getDoc(docRef);
	if (docSnap.exists()) {
		updateDoc(docRef, {
			isActive: false
		})
	} else {
		console.error(`Error: user ${uid} does not exists!`)
	};
}
