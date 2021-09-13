import { doc, collection, setDoc, onSnapshot } from "@firebase/firestore";

export async function addMyUserInfo(statFirestore, uid, userName) {

	await setDoc(doc(statFirestore.dbRootRef, "users", uid), {
		uid: uid,
		userName: userName,
		timeJoined: firebase.firestore.Timestamp.now(),
		isActive: true,
		reaction: "😀"
	}).then((result) => {
		console.log(`Successfully sent user data. ${result}`);
	}).catch((err) => {
		console.error(`Error sending user data: ${err}`);
	});
}

export function listenUserInfo(statFirestore) {
	const unsub = onSnapshot(doc(statFirestore.db, statFirestore.usersCollection, uid), (snapshot) => {
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

	//dbRootRef.collection(usersCollection).onSnapshot((snapshot) => {
	//	snapshot.docChanges().forEach((change) => {
	//const uid = change.doc.data().uid;
	//const userName = change.doc.data().userName;
	//const reaction = change.doc.data().reaction;

	//if (change.type === "added") {
	//	$(`#player-wrapper-${uid}`).children('.player-name').text(userName);
	//}

	//if (change.type === "modified") {

	//	// Listen to reaction change
	//	const currentUserReaction = $(`#player-reaction-${uid}`).text();
	//	if (reaction != currentUserReaction) {

	//		$(`#player-reaction-${uid}`).text(reaction);

	//	} else {

	//		const isActive = change.doc.data().isActive;
	//		if (isActive) {
	//			// userName changed
	//			const uid = change.doc.data().uid;
	//			const userName = change.doc.data().userName;
	//			$(`#player-wrapper-${uid}`).children('.player-name').text(userName);
	//		}
	//		// If user deactivated, it will be automatically updated.
	//		updateTalkBar();

	//	}
	//}
	//	});
	//});

	$("#local-player-name").on('click', function () {
		const oldUserName = options.userName;
		let newUserName = prompt("Please enter your name:", oldUserName);
		if (newUserName == null || newUserName == "") {
			newUserName = oldUserName;
		} else {
			dbRootRef.collection(usersCollection).doc(options.uid.toString()).update({
				userName: newUserName
			});
		}
		options.userName = newUserName;
		$("#local-player-name").text(`${newUserName} (You)`);
	});
}

export function deactivateUser(dbRootRef, uid) {
	const docRef = dbRootRef.collection(usersCollection).doc(uid.toString());
	docRef.get().then((doc) => {
		if (doc.exists) {
			docRef.update({
				isActive: false
			})
		} else {
			console.error(`Error: user ${uid} does not exists!`)
		}
	});
}
