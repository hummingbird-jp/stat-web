const timerSlider = $("#timer-duration")[0];
const timerCollection = "timer";
let isTimerRunningLocally = false;
let lockObj = false;

$(timerSlider).on("input", (e) => {
	setCurrentValue(e.target.value)
});

$('#start-timer').click(function (e) {
	e.preventDefault();

	$('#start-timer').attr('disabled', true);
	$("#start-timer").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	setTimeout(() => {
		$("#timer-slider").css("visibility", "hidden");
		$("#start-timer").css("display", "none");
		$("#stop-timer").css("display", "inline");
		$('#start-timer').html(`<img src="icons/play_arrow_black_24dp.svg" alt="" class="material-icons">`);
		$('#start-timer').attr('disabled', false);
	}, 1000);

	const duration = $("#timer-duration").val();
	const endTime = getEndTime(duration);
	sendTimer(true, endTime);
});

$('#stop-timer').click(function (e) {
	e.preventDefault();

	$('#stop-timer').attr('disabled', true);
	$("#stop-timer").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`)

	setTimeout(() => {
		$('#stop-timer').html(`<img src="icons/stop_black_24dp.svg" alt="" class="material-icons">`);
		$("#timer-slider").css("visibility", "visible");
		$("#stop-timer").css("display", "none");
		$("#start-timer").css("display", "inline");
		$('#stop-timer').attr('disabled', false);
	}, 1000);

	const duration = $("#timer-duration").val();
	const endTime = getEndTime(duration);
	sendTimer(false, endTime)
});

setCurrentValue($("#timer-duration").val());

// Firestore
export function sendTimer(dbRootRef, isRunning, endTime) {

	dbRootRef.collection(timerCollection).doc("temp").set({
		isRunning: isRunning,
		// Timestamp data type for Firestore
		endTime: firebase.firestore.Timestamp.fromDate(endTime),
	}).then(() => {
		console.log(`Timer successfully sent!`);
	}).catch((err) => {
		console.log(`Error sending timer: ${err}`);
	});
}

export function listenTimer(dbRootRef) {

	dbRootRef.collection(timerCollection).doc("temp").onSnapshot((doc) => {
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
function startTimer(endTime) {
	lockObj = false;
	initTimer('clockdiv', endTime);
	isTimerRunningLocally = true;
}

// Stop Timer
function stopTimer() {
	lockObj = true;

	isTimerRunningLocally = false;
}

// Timer Utils
function initTimer(id, endTime) {
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

			initTimer(id, endTime);
		}
	}

	updateTimer();
	const timeinterval = setInterval(updateTimer, 1000);
}

function setCurrentValue(val) {
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

	return {
		total,
		days,
		hours,
		minutes,
		seconds
	};
}

function getEndTime(val) {
	return new Date(Date.parse(new Date()) + val * 60 * 1000);
}
