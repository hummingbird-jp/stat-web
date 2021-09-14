import * as firestore from "@firebase/firestore";

import * as statFirebase from "./stat_firebase";

let isTimerRunningLocally = false;
let lockObj = false;

export function initTimer() {
	setCurrentValue($("#timer-duration").val());
}

// Firestore
export async function sendTimer(isRunning, endTime) {
	const docRef = firestore.doc(statFirebase.dbRootRef, statFirebase.timerCollection, 'temp');

	// Specify doc ID ('temp') to override each time, because no one wants timer log!
	await firestore.setDoc(docRef, {
		isRunning: isRunning,
		endTime: firestore.Timestamp.fromDate(endTime),
	}).then((result) => {
		console.log(`Timer successfully sent! ${result}`);
	}).catch((err) => {
		console.error(`Error sending timer: ${err}`);
	});
}

export function listenTimer() {
	const docRef = firestore.doc(statFirebase.dbRootRef, statFirebase.timerCollection, 'temp');

	const unsub = firestore.onSnapshot(docRef, (doc) => {
		const isTimerRunningOnOthers = doc.data() !== undefined ? doc.data().isRunning : false;
		const endTime = doc.data() !== undefined ? doc.data().endTime.toDate() : undefined;

		if (isTimerRunningLocally !== isTimerRunningOnOthers) {
			console.log(`Change detected on Firestore; fetching...`);

			try {
				if (isTimerRunningOnOthers === true) {
					console.log(`Timer on others has started.`);
					startTimer(endTime);
				} else {
					console.log(`Timer on others has stopped.`);
					stopTimer();
				}
				console.log(`Successfully changed my timer status!`);
			} catch (error) {
				console.error(`Error fetching timer: ${error}`);
			}
		}
	});
}

// Start Timer
function startTimer(endTime) {
	lockObj = false;
	execTimer('clockdiv', endTime);
	isTimerRunningLocally = true;
}

// Stop Timer
function stopTimer() {
	lockObj = true;

	isTimerRunningLocally = false;
}

// Timer Utils
function execTimer(id, endTime) {
	const timer = document.getElementById(id);

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	function updateTimer() {

		const t = getTimeRemaining(endTime);

		$(minutesSpan).text(('0' + t.minutes).slice(-2));
		$(secondsSpan).text(('0' + t.seconds).slice(-2));

		if (lockObj === true) {
			clearInterval(timeinterval);
			lockObj = false;
			return 0;
		}

		if (t.total <= 0) {
			$(timer).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
			clearInterval(timeinterval);

			const timerSound = new Audio("sounds/alarm.wav");
			timerSound.play();

			execTimer(id, endTime);
		}
	}

	updateTimer();
	const timeinterval = setInterval(updateTimer, 1000);
}

export function setCurrentValue(val) {
	const timer = $("#clockdiv")[0];

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	const endTime = getEndTime(val);
	const t = getTimeRemaining(endTime);

	$(minutesSpan).text(('0' + t.minutes).slice(-2));
	$(secondsSpan).text(('0' + t.seconds).slice(-2));
}

function getTimeRemaining(endTime) {
	const total = Date.parse(endTime) - Date.parse(new Date());

	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
	const days = Math.floor(total / (1000 * 60 * 60 * 24));

	return { total, days, hours, minutes, seconds };
}

export function getEndTime(val) {
	return new Date(Date.parse(new Date()) + val * 60 * 1000);
}
