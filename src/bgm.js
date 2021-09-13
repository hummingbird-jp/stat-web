import { doc, getDoc, getDocs, setDoc, collection, onSnapshot, query, where, limit, Timestamp } from "@firebase/firestore";
import { statFirestore } from "./firebase";
import { options } from "./index";

const audioElm = new Audio(statFirestore.uriAudioDefault);

const selectorObj = $("#bgm-selector")[0];
const playButton = $("#play-button")[0];
const stopButton = $("#stop-button")[0];
const playbackIcon = $("#playback-icon")[0];
const volumeSlider = $("#bgm-volume")[0];

let isPlayingLocally = false;

export async function initBgm() {
	configureAudioDefault(audioElm);
	configureControlPanelDefault();

	const collectionRef = collection(statFirestore.db, statFirestore.audioSetCollection);
	const q = query(collectionRef, where('uri', '==', statFirestore.uriAudioDefault), limit(1));

	const querySnapshot = await getDocs(q);

	let defaultTrackId = '';
	querySnapshot.forEach((doc) => {
		defaultTrackId = doc.id;

	});

	const docRef = doc(statFirestore.dbRootRef, statFirestore.bmgCollection, 'temp');
	await setDoc(docRef, {
		currentTime: 0,
		currentTrackId: defaultTrackId,
		isChanged: false,
		isPlaying: false,
	})

}

/*
 * Send BGM status to database (Firestore)
 */
$(playButton).on('click', function (e) {
	e.preventDefault();

	$(playButton).attr('disabled', true);
	$(playButton).html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	const currentTime = audioElm.currentTime;
	if (!isPlayingLocally) {
		// Play/Resume audio
		$(playButton).html(`<img src="icons/play_arrow_black_24dp.svg" alt="" class="material-icons">`);
		$(playButton).attr('disabled', false);
		sendBgmStatus(currentTime, true, true);
		isPlayingLocally = true;
	} else {
		// Pause audio
		sendBgmStatus(currentTime, false, false);
		isPlayingLocally = false;
	}

	let state = this.getAttribute('aria-checked') === "true" ? true : false;
	this.setAttribute('aria-checked', state ? "false" : "true");
});

stopButton.addEventListener("click", function () {
	configureControlPanelDefault();
});

/*
 * Change local volume (BGM only)
 */
$(volumeSlider).on("input", (e) => setAudioVolume(e.target.value));

export function listenBgm() {
	const unsub = onSnapshot(doc(statFirestore.dbRootRef, statFirestore.bmgCollection, 'temp'), (docSnapshot) => {
		docSnapshot.docChanges().forEach((change) => {
			if (change.type === "modified") {
				const currentTrackId = change.doc.data().currentTrackId;
				const currentTime = change.doc.data().currentTime;
				const isPlaying = change.doc.data().isPlaying;
				const isChanged = change.doc.data().isChanged;

				if (isChanged) {
					const docRef = doc(statFirestore.db, statFirestore.audioSetCollection, currentTrackId);

					getDoc(docRef, (doc) => {
						if (doc.exists()) {
							changeTrackTo(doc.data().uri, currentTime);
							changeSelectorTo(doc.data().category);
							configureControlPanelPlaying();
						}
					});
				} else {
					/*
					 * If audio track is not changed but paused or resumed
					 */
					if (isPlaying) {
						audioElm.currentTime = currentTime;
						audioElm.play()
						configureControlPanelPlaying();
					} else {
						audioElm.pause();
						audioElm.currentTime = currentTime;
						configureControlPanelPaused();
					}
				}
			}
		})
	});
}

export async function sendBgmStatus(currentTime, isChanged, isPlaying) {
	const category = selectorObj.value;
	const q = query(collection(statFirestore.db, statFirestore.audioSetCollection), where('category', '==', category), limit(1));
	const docRef = doc(statFirestore.dbRootRef, statFirestore.bmgCollection, 'temp');
	const querySnapshot = await getDocs(q);

	querySnapshot.forEach((doc) => {
		const currentTrackId = doc.id;

		setDoc(docRef, {
			currentTime: currentTime,
			currentTrackId: currentTrackId,
			isChanged: isChanged,
			isPlaying: isPlaying,
		}).catch((err) => {
			console.error(`Error sending BGM: ${err}`);
		});
	});
}

function configureAudioDefault(audioElm) {
	audioElm.preload = 'none';
	audioElm.loop = true;
	audioElm.autoplay = false;
	audioElm.volume = 0.05;
}

function configureControlPanelDefault() {
	stopButton.disabled = true;
	selectorObj.disabled = false;
	selectorObj.value = "default";
	$(playbackIcon).attr("src", "icons/play_arrow_black_24dp.svg");
	playButton.dataset.playing = "preSelect";
}

function configureControlPanelPlaying() {
	setTimeout(() => {
		$(playButton).html(`<img src="icons/pause_black_24dp.svg" alt="" class="material-icons">`);
		$(playButton).attr('disabled', false);
	}, 1000);

	playButton.dataset.playing = 'true';
	stopButton.disabled = true;
	selectorObj.disabled = true;
}

function configureControlPanelPaused() {
	setTimeout(() => {
		$(playButton).html(`<img src="icons/play_arrow_black_24dp.svg" alt="" class="material-icons">`);
		$(playButton).attr('disabled', false);
	}, 1000);

	playButton.dataset.playing = 'false';
	stopButton.disabled = false;
	selectorObj.disabled = true;
}

function changeTrackTo(uri, currentTime) {
	audioElm.src = uri;
	audioElm.pause();
	audioElm.load();
	configureAudioDefault(audioElm);
	audioElm.currentTime = currentTime;
	audioElm.play();
}

function changeSelectorTo(value) {
	selectorObj.value = value;
	selectorObj.disabled = true;
}

function setAudioVolume(value) {
	audioElm.volume = value;
}
