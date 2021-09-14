import * as firestore from "@firebase/firestore";

import * as _ from "..";
import * as statFirebase from "./stat_firebase";

export async function addMyUserInfo() {

	const docRef = firestore.doc(statFirebase.statFirestore.dbRootRef, statFirebase.statFirestore.usersCollection, _.options.uid.toString());

	await firestore.setDoc(docRef, {
		uid: _.options.uid,
		userName: _.options.userName,
		timeJoined: firestore.Timestamp.now(),
		isActive: true,
		reaction: "😀"
	}).then((result) => {
		console.log(`Successfully sent user data. ${result}`);
	}).catch((err) => {
		console.error(`Error sending user data: ${err}`);
	});
}

export async function listenUserInfo() {
	const unsub = firestore.onSnapshot(firestore.collection(statFirebase.statFirestore.dbRootRef, statFirebase.statFirestore.usersCollection), (snapshot) => {
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
		const oldUserName = _.options.userName;
		let newUserName = prompt("Please enter your name:", oldUserName);
		if (newUserName == null || newUserName == "") {
			newUserName = oldUserName;
		} else {
			const docRef = firestore.doc(statFirebase.statFirestore.dbRootRef, statFirebase.statFirestore.usersCollection, _.options.uid.toString());
			const updateUserName = await firestore.updateDoc(docRef, {
				userName: newUserName
			});
		}
		_.options.userName = newUserName;
		$("#local-player-name").text(`${newUserName} (You)`);
	});
}

export async function deactivateMe() {
	const docRef = firestore.doc(statFirebase.statFirestore.dbRootRef, statFirebase.statFirestore.usersCollection, _.options.uid.toString());
	const docSnap = await firestore.getDoc(docRef);
	if (docSnap.exists()) {
		firestore.updateDoc(docRef, {
			isActive: false
		})
	} else {
		console.error(`Error: user ${uid} does not exists!`)
	};
}
