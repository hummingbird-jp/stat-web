const syncTalkdataCollection = "sync-talkdata-beta";

$("#join").click(function () {
	initTalkVisualizer();
});

function initTalkVisualizer() {

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

	console.log("Sampling rate: ", audioCtx.sampleRate);

	let source;
	let stream;


	//　set up the different audio nodes we will use for the app

	const analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -90;
	analyser.maxDecibels = -10;
	analyser.smoothingTimeConstant = 0.85;

	// set up canvas context for visualizer

	const canvas = document.getElementById("voice-visualizer");
	const canvasCtx = canvas.getContext("2d");

	const intendedWidth = document.querySelector('.col-md-6').clientWidth;
	canvas.setAttribute('width', intendedWidth);

	let drawVisual;

	/*
	 * Variables for talk amount observer
	 */
	const talkCanvas = document.getElementById("talk-amount-visualizer");
	const talkCanvasCtx = talkCanvas.getContext("2d");
	const talkDataBufferLength = 1024;
	const talkDataArray = new Array(talkDataBufferLength).fill(0);
	const talkDataSendTrigger = new Array(talkDataBufferLength).fill(0);
	let isTalking = false;
	let shouldContinue = true;

	talkCanvas.setAttribute("width", intendedWidth);
	talkDataSendTrigger[talkDataSendTrigger.length - 1] = 1;

	//main block for doing the audio recording

	if (navigator.mediaDevices.getUserMedia) {
		console.log('getUserMedia supported.');
		const constraints = { audio: true }
		navigator.mediaDevices.getUserMedia(constraints)
			.then(
				function (stream) {
					source = audioCtx.createMediaStreamSource(stream);
					source.connect(analyser);
					visualize();
				})
			.catch(function (err) { console.log('The following gUM error occured: ' + err); })
	} else {
		console.log('getUserMedia not supported on your browser!');
	}

	function visualize() {
		const WIDTH = canvas.width;
		const HEIGHT = canvas.height;

		analyser.fftSize = 256;

		const bufferLengthAlt = analyser.frequencyBinCount;
		const freqRes = (audioCtx.sampleRate / 2) / bufferLengthAlt;
		const dataArrayAlt = new Uint8Array(bufferLengthAlt);

		canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

		const draw = function () {
			drawVisual = requestAnimationFrame(draw);

			/*
			 * Note: Stop animation when "leave" button clicked.
			 */
			if (!shouldContinue) {
				cancelAnimationFrame(drawVisual);
			}

			analyser.getByteFrequencyData(dataArrayAlt);

			canvasCtx.fillStyle = 'rgb(0, 0, 0)';
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

			let barWidth;
			let barWidthSum = new Array(1).fill(0);

			const audioFreqAvg = dataArrayAlt.reduce((a, b) => a + b) / bufferLengthAlt;
			const start = Math.ceil(100 / freqRes);
			const end = Math.ceil(400 / freqRes)
			const voiceVolume = dataArrayAlt.slice(start, end).reduce((a, b) => a + b) / (end - start);

			for (let i = 0; i < bufferLengthAlt; i++) {
				barWidth = dataArrayAlt[i];

				if (i > Math.ceil(100 / freqRes) && i < Math.ceil(400 / freqRes) + 1) {
					barWidthSum.push(barWidth);
					if (barWidth > audioFreqAvg && barWidth > 80) {
						isTalking = true;
						canvasCtx.fillStyle = 'rgb(' + (barWidth + 100) + ',255,60)';
					} else {
						isTalking = false;
						canvasCtx.fillStyle = 'rgb(' + (barWidth + 100) + ',60,60)';
					}
				}
			}
			canvasCtx.fillRect(0, 0, WIDTH * barWidthSum.reduce((a, b) => a + b) / (barWidthSum.length - 1) / 255, HEIGHT);

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
				const talkDataAvg = talkDataArray.reduce((a, b) => a + b) / talkDataArray.length;
				sendTalkDataToFirebase(talkDataAvg);
				talkDataSendTrigger.push(1);
				getTalkDataFromFirebase().then(value => {
					const talkHeight = talkCanvas.height;
					const usernameArray = value.userNames;
					const talksums = value.sums;

					talkCanvasCtx.clearRect(0, 0, WIDTH, talkHeight);

					talkCanvasCtx.fillStyle = 'rgb(38, 38, 38)';
					talkCanvasCtx.fillRect(0, 0, WIDTH, talkHeight);

					/*
					 * TODO: More frexible code needed!!
					 */
					let sum = talksums.reduce((a, b) => a + b);
					// console.log(talksums);
					console.log("sum ", sum);
					let deltaWidth = WIDTH / sum;
					let x = 0;
					for (let i = 0; i < talksums.length; i++) {
						const width = deltaWidth * talksums[i];

						talkCanvasCtx.fillStyle = 'rgb(' + (60 * i + 50) + ',' + (-60 * i + 250) + ',' + (30 * i + 150) + ')';
						talkCanvasCtx.fillRect(x, 0, width, HEIGHT);

						talkCanvasCtx.font = '12px serif';
						talkCanvasCtx.fillStyle = 'rgb(255, 255, 255)';
						talkCanvasCtx.fillText(usernameArray[i], x, 40, width);

						x += width;
					}
				});
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

function sendTalkDataToFirebase(value) {
	const timestamp = firebase.firestore.Timestamp.now();
	const userName = options.userName;

	db.collection(syncTalkdataCollection).add({
		timestamp: timestamp,
		talkValue: value,
		userName: userName
	})
		.then(function () {
			console.log("log: talkdata sent", Math.round(value), userName);
		})
		.catch((error) => {
			console.error("Error adding document: ", error);
		});
}

async function getTalkDataFromFirebase() {
	const myUserName = options.userName;

	/*
	 * Note: Player names are given in this version.
	 * TODO: We should share and unify user names between agora and Firestore.
	 */
	// const playerNames = $(".player-name").text();
	// console.log("player name: ", playerNames);

	const userNames = ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8", "user9"];
	const querySnapshot = await db.collection(syncTalkdataCollection).orderBy("timestamp", "desc").limit(10).get()

	let sums = new Array(userNames.length).fill(0);
	querySnapshot.forEach((doc) => {
		for (let i = 0; i < userNames.length; i++) {
			if (doc.data().userName === userNames[i]) {
				sums[i] += doc.data().talkValue;
			}
		}
	})
	for (let i = 0; i < userNames.length; i++) {
		console.log(userNames[i], " : ", Math.round(sums[i]));
	}
	return {
		userNames,
		sums
	};
}
