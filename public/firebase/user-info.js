function addMyUserInfo() {
	dbRootRef.collection(usersCollection).add({
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

			/*
			 * Todo: User name changalbe (such as "rename" funciton)
			 */
			//if (change.type === "modified") {
			//	console.log("User modified! ", change.doc.data());
			//}
			//if (change.type === "removed") {
			//	console.log("User removed! ", change.doc.data());
			//}
		})
	})
}
