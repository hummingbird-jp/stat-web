import * as auth from "firebase/auth";
import * as bootstrap from "bootstrap";
import * as firestore from "@firebase/firestore";
import * as stat_firebase from "./stat_firebase";
import * as voiceVisualizer from "./voice-visualizer";
import * as _ from "..";

export const user = {
	// User info from "sign in with google"
	displayNameAuth: undefined,
	email: undefined,
	uid: undefined,
	photoURL: undefined,
	// User info for creating a call
	token: undefined,
	channel: undefined,
	// User info for Stat! functions
	displayNameStat: undefined,
	timeJoined: undefined,
	isActive: undefined,
	reaction: undefined
};

export const authInstance = auth.getAuth(stat_firebase.firebaseApp);

export async function signin() {
	const authInstance = auth.getAuth(stat_firebase.firebaseApp);

	await auth.setPersistence(authInstance, auth.browserLocalPersistence);

	const provider = new auth.GoogleAuthProvider();
	const result = await auth.signInWithPopup(authInstance, provider);
	const credential = auth.GoogleAuthProvider.credentialFromResult(result);
	const token = credential.accessToken;

	user.displayNameAuth = result.user.displayName;
	user.displayNameAuth = result.user.displayName;
	user.email = result.user.email;
	user.uid = result.user.uid;
	user.photoURL = result.user.photoURL;

	console.log(`Signed in: ${user.displayNameAuth}`);

	$("#display-name").text(`Welcome back, ${user.displayNameAuth} 👋`);

	const toastOptions = { animation: true, autohide: true, delay: 3000 };
	const welcomeMessageElement = new bootstrap.Toast($('#welcome-message'), toastOptions);

	welcomeMessageElement.show();

	// Change placeholder of join/create form
	$("#userNameJoin").val(user.displayNameAuth);
	$("#userNameCreate").val(user.displayNameAuth);
}

export async function addMyUserInfo() {

	// 1. Add/update to "users" collection
	const docRefUsers = firestore.doc(stat_firebase.db, 'users', user.uid);
	const docUsers = await firestore.getDoc(docRefUsers);
	if (docUsers.exists()) {
		firestore.updateDoc(docRefUsers, {
			displayNameAuth: user.displayNameAuth,
			email: user.email,
			uid: user.uid,
			photoURL: user.photoURL,
			timeJoined: firestore.Timestamp.now(),
			isActive: true,
		});
	} else {
		console.log("Welcome to Stat!");
		firestore.setDoc(docRefUsers, {
			displayNameAuth: user.displayNameAuth,
			email: user.email,
			uid: user.uid,
			photoURL: user.photoURL,
			timeJoined: firestore.Timestamp.now(),
			isActive: true,
			// For Brand New User!
			firstSignedInAt: firestore.Timestamp.now()
		});
	}

	// 2. Add to "meetings" collection
	const docRef = firestore.doc(stat_firebase.dbRootRef, stat_firebase.usersCollection, user.uid);

	await firestore.setDoc(docRef, {
		uid: user.uid,
		displayNameStat: user.displayNameStat,
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
	const unsub = firestore.onSnapshot(firestore.collection(stat_firebase.dbRootRef, stat_firebase.usersCollection), (snapshot) => {
		snapshot.docChanges().forEach((change) => {
			const uid = change.doc.data().uid;
			const displayNameStat = change.doc.data().displayNameStat;
			const reaction = change.doc.data().reaction;

			if (change.type === "added") {
				$(`#player-wrapper-${uid}`).children('.player-name').text(displayNameStat);
			}

			if (change.type === "modified") {

				// Listen to reaction change
				const currentUserReaction = $(`#player-reaction-${uid}`).text();
				if (reaction != currentUserReaction) {

					$(`#player-reaction-${uid}`).text(reaction);

				} else {
					// displayNameStat changed
					const uid = change.doc.data().uid;
					const displayNameStat = change.doc.data().displayNameStat;
					$(`#player-wrapper-${uid}`).children('.player-name').text(displayNameStat);

					// If user deactivated, it will be automatically updated.
					voiceVisualizer.updateTalkBar();
				}
			}
		});
	});

	$("#local-player-name").on('click', async function () {
		const oldUserName = user.displayNameStat;
		let newUserName = prompt("Please enter your name:", oldUserName);
		if (newUserName == null || newUserName == "") {
			newUserName = oldUserName;
		} else {
			const docRef = firestore.doc(stat_firebase.dbRootRef, stat_firebase.usersCollection, user.uid);
			const updateUserName = await firestore.updateDoc(docRef, {
				displayNameStat: newUserName
			});
		}
		user.displayNameStat = newUserName;
		$("#local-player-name").text(`${newUserName} (You)`);
	});
}

export async function adjustMyActiveStatus(isActive) {
	const docRef = firestore.doc(stat_firebase.dbRootRef, stat_firebase.usersCollection, user.uid);
	const docSnap = await firestore.getDoc(docRef);
	if (docSnap.exists()) {
		firestore.updateDoc(docRef, {
			isActive: isActive
		})
	} else {
		console.error(`Error: user ${uid} does not exists!`)
	};
}
