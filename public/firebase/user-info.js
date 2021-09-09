function addMyUserInfo() {
	dbRootRef.collection(usersCollection).doc(options.uid.toString()).set({
		uid: options.uid,
		userName: options.userName,
		timeJoined: firebase.firestore.Timestamp.now(),
		isActive: true
	}).then(() => {
		console.log(`User data sent.`);
	}).catch((err) => {
		console.error(`Error: ${err}`);
	});
}

function listenUserInfo() {
	dbRootRef.collection(usersCollection).onSnapshot((snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				console.log("User added! ", change.doc.data());

				const uid = change.doc.data().uid;
				const userName = change.doc.data().userName;
				$(`#player-wrapper-${uid}`).children('p').text(userName);
			}

			if (change.type === "modified") {
				const isActive = change.doc.data().isActive;
				if (isActive) {
					// userName changed
					const uid = change.doc.data().uid;
					const userName = change.doc.data().userName;
					$(`#player-wrapper-${uid}`).children('p').text(userName);
				}
				updateTalkBar();
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
