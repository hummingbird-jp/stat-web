import * as firestore from "@firebase/firestore";

import * as _ from "../index";
import * as statFirebase from "./stat_firebase";

const selectorObj = $("#bgm-selector")[0];
const playButton = $("#play-button")[0];
const stopButton = $("#stop-button")[0];
const playbackIcon = $("#playback-icon")[0];
const volumeSlider = $("#bgm-volume")[0];

let audioElm;
const audioTrackData = {
	categoryLocal: '',
	categoryFirestore: ''
};

export async function init() {
	audioElm = new Audio(statFirebase.uriAudioDefault);

	// If you are the first person in the meeting, initialize Firestore document.
	const docRef = firestore.doc(statFirebase.dbRootRef, statFirebase.bgmCollection, 'temp');
	const docSnap = await firestore.getDoc(docRef);
	if (!docSnap.exists()) {
		initBgmFirestoreDoc();
	}

	//Create event listener to change local bgm volume
	$(volumeSlider).on("input", function (e) {
		audioElm.volume = e.target.value;
	});

	// Create event listner to Send BGM status to Firestore
	$(playButton).on('click', function (e) {
		e.preventDefault();

		$(playButton).attr('disabled', true);
		$(playButton).html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

		const category = selectorObj.value;
		if (category != audioTrackData.categoryFirestore) {
			// New bgm selected
			console.log("New bgm selected!")
			sendBgmStatus(0, true, true);
		} else {
			const currentTime = audioElm.currentTime;
			if (audioElm.paused) {
				// Play/Resume audio
				sendBgmStatus(currentTime, false, true);
			} else {
				// Pause audio
				sendBgmStatus(currentTime, false, false);
			}
		}
	});

	// Create eventlistenr for stop button
	$(stopButton).on('click', function (e) {
		e.preventDefault();
		sendBgmStatus(0, true, false);
	})

	listenBgm();
}

async function initBgmFirestoreDoc() {

	const collectionRef = firestore.collection(statFirebase.db, statFirebase.audioSetCollection);
	const q = firestore.query(collectionRef, firestore.where('uri', '==', statFirebase.uriAudioDefault), firestore.limit(1));

	const querySnapshot = await firestore.getDocs(q);

	let defaultTrackId;
	let category;
	querySnapshot.forEach((doc) => {
		defaultTrackId = doc.id;
		category = doc.data().category;
	});

	const docRef = firestore.doc(statFirebase.dbRootRef, statFirebase.bgmCollection, 'temp');
	await firestore.setDoc(docRef, {
		currentTime: 0,
		currentTrackId: defaultTrackId,
		category: category,
		isChanged: true,
		isPlaying: false,
	})
}

function listenBgm() {
	const collectionRef = firestore.collection(statFirebase.dbRootRef, statFirebase.bgmCollection);
	const unsub = firestore.onSnapshot(collectionRef, (docSnapshot) => {
		docSnapshot.docChanges().forEach(async (change) => {
			if (change.type === "modified") {

				const currentTrackId = change.doc.data().currentTrackId;
				const currentTime = change.doc.data().currentTime;
				const isPlaying = change.doc.data().isPlaying;
				const isChanged = change.doc.data().isChanged;
				const category = change.doc.data().category;

				console.log("debug: ", category, isPlaying, isChanged);

				audioTrackData.categoryFirestore = category;

				if (isChanged && isPlaying) {
					// When someone has changed the bgm track and played
					console.log("debug are you here? 1")
					const docRef = firestore.doc(statFirebase.db, statFirebase.audioSetCollection, currentTrackId);
					const snapshot = await firestore.getDoc(docRef);
					changeSelectorTo(snapshot.data().category);
					changeTrackTo(snapshot.data().uri, currentTime);
					setLocalPlay();

				} else if (isChanged && !isPlaying) {
					// When someone has stopped the bgm
					setLocalStop();

				} else if (!isChanged && isPlaying) {
					// When someone has just resume the same track
					audioElm.currentTime = currentTime;
					setLocalPlay();

				} else if (!isChanged && !isPlaying) {
					// When someone has paused the track
					setLocalPause();
				}
			}
		})
	});
}

async function sendBgmStatus(currentTime, isChanged, isPlaying) {
	const category = selectorObj.value;
	const q = firestore.query(firestore.collection(statFirebase.db, statFirebase.audioSetCollection), firestore.where('category', '==', category), firestore.limit(1));
	const docRef = firestore.doc(statFirebase.dbRootRef, statFirebase.bgmCollection, 'temp');
	const querySnapshot = await firestore.getDocs(q);

	querySnapshot.forEach((doc) => {
		const currentTrackId = doc.id;

		firestore.updateDoc(docRef, {
			currentTime: currentTime,
			currentTrackId: currentTrackId,
			category: category,
			isChanged: isChanged,
			isPlaying: isPlaying,
		}).catch((err) => {
			console.error(`Error sending BGM: ${err}`);
		});
	});
}

function setLocalPlay() {
	audioElm.play();

	// Configure control panel as 'Playing'
	$(playButton).attr('disabled', true);
	$(playButton).html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);
	setTimeout(() => {
		$(playButton).html(`<img src="icons/pause_black_24dp.svg" alt="" class="material-icons">`);
		$(playButton).attr('disabled', false);
	}, 1000);

	stopButton.disabled = true;
	selectorObj.disabled = true;
}

function setLocalPause() {
	audioElm.pause();

	// Configure control panel as 'Paused'
	$(playButton).attr('disabled', true);
	$(playButton).html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);
	setTimeout(() => {
		$(playButton).html(`<img src="icons/play_arrow_black_24dp.svg" alt="" class="material-icons">`);
		$(playButton).attr('disabled', false);
	}, 1000);

	stopButton.disabled = false;
	selectorObj.disabled = true;
};

function setLocalStop() {
	audioElm.pause();

	// Configure control panel as 'Stopped'
	$(playbackIcon).attr("src", "icons/play_arrow_black_24dp.svg");
	selectorObj.value = "natural";

	stopButton.disabled = true;
	selectorObj.disabled = false;

}

function configureAudioDefault(audioElm) {
	audioElm.preload = 'none';
	audioElm.loop = true;
	audioElm.autoplay = false;
	audioElm.volume = 0.05;
}

function changeTrackTo(uri, currentTime) {
	audioElm.src = uri;
	audioElm.pause();
	audioElm.load();
	configureAudioDefault(audioElm);
	audioElm.currentTime = currentTime;
}

function changeSelectorTo(value) {
	selectorObj.value = value;
	selectorObj.disabled = true;
}
