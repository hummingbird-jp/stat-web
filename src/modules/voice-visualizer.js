import * as firestore from "@firebase/firestore";
import * as stat_auth from "./stat_auth";
import * as _ from "..";
import * as stat_firebase from "./stat_firebase";
import { statConsoleLog } from "./utils";

const colorPalette = ["#BF1F5A", "#0583F2", "#5FD93D", "#F2780C"];

export function init() {
	// Older browsers might not implement mediaDevices at all, so we set an empty object first
	if (navigator.mediaDevices === undefined) {
		navigator.mediaDevices = {};
	}

	// Some browsers partially implement mediaDevices. We can't just assign an object
	// with getUserMedia as it would overwrite existing properties.
	// Here, we will just add the getUserMedia property if it's missing.
	if (navigator.mediaDevices.getUserMedia === undefined) {
		navigator.mediaDevices.getUserMedia = function (constraints) {

			// First get ahold of the legacy getUserMedia, if present
			const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

			// Some browsers just don't implement it - return a rejected promise with an error
			// to keep a consistent interface
			if (!getUserMedia) {
				return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
			}

			// Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
			return new Promise(function (resolve, reject) {
				getUserMedia.call(navigator, constraints, resolve, reject);
			});
		}
	}

	// set up forked web audio context, for multiple browsers
	// window. is needed otherwise Safari explodes

	const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	statConsoleLog(`Sampling rate: ${audioCtx.sampleRate}`);

	let source;
	let stream;


	//　set up the different audio nodes we will use for the app

	const analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -90;
	analyser.maxDecibels = -10;
	analyser.smoothingTimeConstant = 0.85;

	let drawVisual;

	/*
	 * Variables for talk amount observer
	 */

	const talkDataBufferLength = 1024;
	const talkDataArray = new Array(talkDataBufferLength).fill(0);
	const talkDataSendTrigger = new Array(talkDataBufferLength).fill(0);
	let isTalking = false;
	let shouldContinue = true;

	talkDataSendTrigger[talkDataSendTrigger.length - 1] = 1;

	//main block for doing the audio recording

	if (navigator.mediaDevices.getUserMedia) {
		statConsoleLog("Successfully got user media.");
		const constraints = { audio: true }
		navigator.mediaDevices.getUserMedia(constraints)
			.then(
				function (stream) {
					source = audioCtx.createMediaStreamSource(stream);
					source.connect(analyser);
					visualize();
				})
			.catch(function (err) {
				statConsoleLog(`Error getting user media: ${err}`);
			});
	} else {
		statConsoleLog("User media not supported.");
	}

	function visualize() {

		analyser.fftSize = 256;

		const bufferLengthAlt = analyser.frequencyBinCount;
		const freqRes = (audioCtx.sampleRate / 2) / bufferLengthAlt;
		const dataArray = new Uint8Array(bufferLengthAlt);

		const draw = function () {
			drawVisual = requestAnimationFrame(draw);

			/*
			 * Note: Stop animation when "leave" button clicked.
			 */
			if (!shouldContinue) {
				cancelAnimationFrame(drawVisual);
			}

			analyser.getByteFrequencyData(dataArray);

			let barWidth;

			const audioFreqAvg = dataArray.reduce((a, b) => a + b) / bufferLengthAlt;
			const start = Math.ceil(100 / freqRes);
			const end = Math.ceil(400 / freqRes)
			const voiceVolume = dataArray.slice(start, end).reduce((a, b) => a + b) / (end - start);

			for (let i = 0; i < bufferLengthAlt; i++) {
				barWidth = dataArray[i];

				if (i > Math.ceil(100 / freqRes) && i < Math.ceil(400 / freqRes) + 1) {
					if (barWidth > audioFreqAvg && barWidth > 90) {
						isTalking = true;
						$(".video-wrapper").css({
							'background-color': '#5FD93D'
						})
					} else {
						isTalking = false;
						$(".video-wrapper").css({
							'background-color': '#0D0D0D'
						})
					}
				}
			}

			/*
			 * Update talkDataArray
			 */
			talkDataArray.shift();
			if (isTalking) {
				talkDataArray.push(voiceVolume);
			} else {
				talkDataArray.push(0);
			}

			/*
			 * Update talkDataSendTrigger
			 */
			talkDataSendTrigger.shift();
			if (talkDataSendTrigger[0] === 1) {
				talkDataSendTrigger.push(1);

				const talkDataAvg = talkDataArray.reduce((a, b) => a + b) / talkDataArray.length;
				sendTalkDataToFirebase(talkDataAvg);

				updateTalkBar();

			} else {
				talkDataSendTrigger.push(0);
			}
		};

		draw();

	}

	$("#leave").on("click", function () {
		audioCtx.close().then(function () {
			console.log("Audio Context was closed. ");
		});
		shouldContinue = false;
		const constraints = { audio: true }

		/*
		 * Note: use MediaStreamTrack.stop() to stop tracks,
		 * but the red circle sign on the right side of web browzer tab remains.
		 */
		navigator.mediaDevices.getUserMedia(constraints)
			.then(
				function (stream) {
					const tracks = stream.getTracks();
					tracks.forEach(function (track) {
						track.stop();
						console.log("log : track stopped")
					});
				})
			.catch(function (err) { console.log('The following gUM error occured: ' + err); })
	});

}

async function sendTalkDataToFirebase(value) {

	const collectionRef = firestore.collection(stat_firebase.meetingDocRef, stat_firebase.talkDataCollection);
	await firestore.addDoc(collectionRef, {
		userName: stat_auth.user.displayNameStat,
		uid: stat_auth.user.uid,
		timestamp: firestore.Timestamp.now(),
		talkValue: value
	})
}

async function getTalkDataFromFirebase() {
	let users = [];
	const collectionRef = firestore.collection(stat_firebase.meetingDocRef, stat_firebase.usersCollection);
	const querySnapshotUser = await firestore.getDocs(collectionRef);
	querySnapshotUser.forEach((doc) => {
		if (doc.data().isActive) {
			users.push({
				"displayNameStat": doc.data().displayNameStat,
				"uid": doc.data().uid,
				"talkSum": 0
			});
		}
	});

	const talkDataRef = firestore.collection(stat_firebase.meetingDocRef, stat_firebase.talkDataCollection)
	const q = firestore.query(talkDataRef, firestore.orderBy("timestamp", "desc"), firestore.limit(10));
	const querySnapshotTalkData = await firestore.getDocs(q);

	querySnapshotTalkData.forEach((doc) => {
		for (let i = 0; i < users.length; i++) {
			if (doc.data().uid === users[i].uid) {
				users[i].talkSum += doc.data().talkValue;
			}
		}
	})

	// reorder by talkSum
	users.sort(function (a, b) {
		return b.talkSum - a.talkSum;
	});

	return users;
}

export function updateTalkBar() {
	const canvas = document.getElementById("talk-amount-visualizer");
	const canvasCtx = canvas.getContext("2d");
	getTalkDataFromFirebase().then(result => {
		let sum = 0;
		for (let i = 0; i < result.length; i++) {
			sum += result[i].talkSum;
		}
		canvas.setAttribute("width", $('#voice-visualizer-group').first().innerWidth());
		const WIDTH = canvas.width;
		const HEIGHT = canvas.height;

		canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

		canvasCtx.fillStyle = '#0D0D0D';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		let deltaWidth = WIDTH / sum;

		let x = 0;
		let width;
		const height = HEIGHT / 5;
		for (let i = 0; i < result.length; i++) {
			width = deltaWidth * result[i].talkSum;

			canvasCtx.fillStyle = colorPalette[i % colorPalette.length];
			canvasCtx.fillRect(x, 0, width, height);

			canvasCtx.font = '0.9em sans-serif';
			canvasCtx.fillStyle = '#FFFFFF';
			canvasCtx.fillText(result[i].displayNameStat, x, height + 20, width);

			x += width;
		}
	});
}
