import * as auth from "firebase/auth";
import * as bootstrap from "bootstrap";

import * as stat_firebase from "./stat_firebase";

export const user = {
	displayName: undefined,
	email: undefined,
	uid: undefined,
	photoURL: undefined,
};

export async function signin() {
	const authInstance = auth.getAuth(stat_firebase.firebaseApp);
	const provider = new auth.GoogleAuthProvider();

	auth.signInWithPopup(authInstance, provider)
		.then((result) => {
			const credential = auth.GoogleAuthProvider.credentialFromResult(result);
			const token = credential.accessToken;

			user.displayName = result.user.displayName;
			user.email = result.user.email;
			user.uid = result.user.uid;
			user.photoURL = result.user.photoURL;
			console.log(`Logged in: ${user.displayName}`);

			$("#display-name").text(`Welcome back, ${user.displayName} 👋`);

			const toastOptions = { animation: true, autohide: true, delay: 3000 };
			const welcomeMessageElement = new bootstrap.Toast($('#welcome-message'), toastOptions);

			welcomeMessageElement.show();

			return true;
		}).catch((error) => {
			const errorMessage = error.message;

			console.log(`Log in failed: ${errorMessage}`);

			return false;
		});
}
