import * as firestore from "@firebase/firestore";
import * as stat_firebase from "./stat_firebase";

let isTimerRunningLocally;
let shouldStop;

function startTimer(startedAt, endAt) {
	isTimerRunningLocally = true;
	shouldStop = false;

	const canvas = $("#timer-dynamic")[0];
	const ctx = canvas.getContext("2d");
	const SIZE = 128;
	const ARCWIDTH = 4;
	canvas.width = SIZE;
	canvas.height = SIZE;

	const x = SIZE / 2;
	const y = SIZE / 2;
	const radius = SIZE / 2 - ARCWIDTH;
	const angleEnd = 1.5 * Math.PI;

	//Create gradient
	const corner = radius * Math.sqrt(2) / 2;
	const gradient = ctx.createLinearGradient(SIZE / 2 - corner, SIZE / 2 - corner, SIZE / 2 + corner, SIZE / 2 + corner);
	gradient.addColorStop(0.00, '#bf1f5a');
	gradient.addColorStop(0.25, '#f2780c');
	gradient.addColorStop(0.50, '#43bf30');
	gradient.addColorStop(1.00, '#0476d9');

	// Hide static timer and show dynamic timer
	$("#timer-static").css("display", "none");
	$("#timer-dynamic").css("display", "block");

	draw();
	const timeinterval = setInterval(draw, 1000);

	function draw() {
		const t = getRemainTime(startedAt, endAt);
		const angleStart = (2.0 * t.ratio - 0.5) * Math.PI;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw arc
		ctx.beginPath();
		ctx.arc(x, y, radius, angleStart, angleEnd);
		ctx.strokeStyle = gradient;
		ctx.lineWidth = ARCWIDTH;
		ctx.lineCap = 'round';
		ctx.stroke();

		// Draw Timer Text
		ctx.font = '24px sans-serif';
		ctx.fillStyle = "#FFFFFF";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(t.remain_text, x, y);

		if (shouldStop) {
			clearInterval(timeinterval);
			$("#timer-dynamic").css("display", "none");
			$("#timer-static").css("display", "block");
		}

		if (t.remain <= 0) {
			clearInterval(timeinterval);
			$("#timer-dynamic").css("display", "none");
			$("#timer-static").css("display", "block");
			$("#timer-static p").text('00:00');
			$("#timer-static").fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500).fadeOut(500).fadeIn(500);
			const alarm = new Audio("../sounds/alarm.wav");
			alarm.play();
		}
	}
}

function stopTimer() {
	shouldStop = true;
	isTimerRunningLocally = false;
}

function getRemainTime(startedAt, endAt) {
	const nowAt = firestore.Timestamp.now();
	const total = endAt.seconds - startedAt.seconds;
	const remain = endAt.seconds - nowAt.seconds;
	const ratio = 1.0 - remain / total;

	const remain_sec = Math.floor(remain % 60);
	const remain_min = Math.floor((remain / 60) % 60);
	const remain_text = ('0' + remain_min).slice(-2) + ':' + ('0' + remain_sec).slice(-2);

	return { remain: remain, ratio: ratio, remain_text: remain_text };
}

// Firestore
export async function sendTimer(isRunning, durationMin) {
	const nowMillis = firestore.Timestamp.now().toMillis();
	const durationMillis = durationMin * 60 * 1000;
	const endAt = firestore.Timestamp.fromMillis(nowMillis + durationMillis);

	const docRef = firestore.doc(stat_firebase.dbRootRef, stat_firebase.timerCollection, 'temp');

	// Specify doc ID ('temp') to override each time, because no one wants timer log!
	await firestore.setDoc(docRef, {
		isRunning: isRunning,
		endAt: endAt,
		startedAt: firestore.Timestamp.now()
	}).then((result) => {
		console.log(`Timer successfully sent! ${result}`);
	}).catch((err) => {
		console.error(`Error sending timer: ${err}`);
	});
}

export function listenTimer() {
	const docRef = firestore.doc(stat_firebase.dbRootRef, stat_firebase.timerCollection, 'temp');

	const unsub = firestore.onSnapshot(docRef, (doc) => {
		const isTimerRunningOnOthers = doc.data() !== undefined ? doc.data().isRunning : false;
		const endAt = doc.data() !== undefined ? doc.data().endAt : undefined;
		const startedAt = doc.data() !== undefined ? doc.data().startedAt : undefined;

		if (isTimerRunningLocally !== isTimerRunningOnOthers) {
			if (isTimerRunningOnOthers === true) {
				console.log(`Timer on others has started.`);
				startTimer(startedAt, endAt);
			} else {
				console.log(`Timer on others has stopped.`);
				stopTimer();
			}
		}
	});
}
