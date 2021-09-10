function addMyUserInfo() {
	dbRootRef.collection(usersCollection).doc(options.uid.toString()).set({
		uid: options.uid,
		userName: options.userName,
		timeJoined: firebase.firestore.Timestamp.now(),
		isActive: true,
		reaction: "😀"
	}).then(() => {
		console.log(`User data sent.`);
	}).catch((err) => {
		console.error(`Error: ${err}`);
	});
}

function sendMyReaction(text) {
	dbRootRef.collection(usersCollection).doc(options.uid.toString()).update({
		reaction: text
	})
}

function listenUserInfo() {
	dbRootRef.collection(usersCollection).onSnapshot((snapshot) => {
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

			//if (change.type === "modified") {
			//	console.log("User modified! ", change.doc.data());
			//}
			//if (change.type === "removed") {
			//	console.log("User removed! ", change.doc.data());
			//}
		})
	})

	$("#local-player-name").click(function () {
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
	})
}

function deactivateUser(uid) {
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
