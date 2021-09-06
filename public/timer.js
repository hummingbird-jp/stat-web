const timerSlider = $("#timer-duration")[0];
const syncTimerCollection = 'sync-timer-beta';
let isTimerRunningLocally = false;
let lockObj = false;

$(timerSlider).on("input", (e) => {
	setCurrentValue(e.target.value)
});

$('#start-timer').click(function (e) {
	e.preventDefault();

	const duration = $("#timer-duration").val();
	const endTime = getEndTime(duration);
	sendTimer(true, endTime);
});

$('#stop-timer').click(function (e) {
	e.preventDefault();

	const duration = $("#timer-duration").val();
	const endTime = getEndTime(duration);
	sendTimer(false, endTime)
});

setCurrentValue($("#timer-duration").val());

// Firestore
function sendTimer (isRunning, endTime) {
	const timerRef = db.collection(syncTimerCollection).doc(meetingId);

	console.log(`isRunning: ${isRunning}`);
	console.log(`endTime: ${endTime}`);

	console.log(`meetingId: ${meetingId}`);

	timerRef.set({
		isRunning: isRunning,
		// Timestamp data type for Firestore
		endTime: firebase.firestore.Timestamp.fromDate(endTime),
	}).then(() => {
		console.log(`Timer successfully sent!`);
	}).catch((err) => {
		console.log(`Error sending timer: ${err}`);
	});
}

function listenTimer () {
	console.log(`Started listening timer status...`);

	db.collection(syncTimerCollection).doc(meetingId).onSnapshot((doc) => {
		const isTimerRunningOnOthers = doc.data().isRunning;
		const endTime = doc.data().endTime.toDate();

		// 自分の状態と他クライアントの状態が異なる場合、他クライアントに合わせる
		if (isTimerRunningLocally !== isTimerRunningOnOthers) {
			console.log(`Change detected on Firestore; fetching...`);

			if (isTimerRunningOnOthers === true) {
				console.log(`Timer on others has started.`);
				startTimer(endTime);
			} else {
				console.log(`Timer on others has stopped.`);
				stopTimer();
			}

			console.log(`Successfully changed my timer status!`);
		}
	});
}

// Start Timer
function startTimer (endTime) {
	initTimer('clockdiv', endTime);

	$("#timer-slider").css("visibility", "hidden");
	$("#start-timer").css("display", "none");
	$("#stop-timer").css("display", "inline");

	isTimerRunningLocally = true;
}

// Stop Timer
function stopTimer () {
	lockObj = true;

	$("#timer-slider").css("visibility", "visible");
	$("#stop-timer").css("display", "none");
	$("#start-timer").css("display", "inline");

	isTimerRunningLocally = false;
}

// Timer Utils
function initTimer (id, endTime) {
	const timer = document.getElementById(id);

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	function updateTimer () {

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

			initTimer(id, endTime);
		}
	}

	updateTimer();
	const timeinterval = setInterval(updateTimer, 1000);
}

function setCurrentValue (val) {
	const timer = $("#clockdiv")[0];

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	const endTime = getEndTime(val);
	const t = getTimeRemaining(endTime);

	$(minutesSpan).text(('0' + t.minutes).slice(-2));
	$(secondsSpan).text(('0' + t.seconds).slice(-2));
}

function getTimeRemaining (endTime) {
	const total = Date.parse(endTime) - Date.parse(new Date());

	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
	const days = Math.floor(total / (1000 * 60 * 60 * 24));

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	};
}

function getEndTime (val) {
	return new Date(Date.parse(new Date()) + val * 60 * 1000);
}
