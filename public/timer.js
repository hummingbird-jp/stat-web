const timerSlider = $("#timer-duration")[0];
let lockObj = false;

$(timerSlider).on("input", (e) => setCurrentValue(e.target.value));
setCurrentValue(timerSlider.value);

function getTimeRemaining(endtime) {
	const total = Date.parse(endtime) - Date.parse(new Date());

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

function initTimer(id, endtime) {
	const timer = document.getElementById(id);

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	timer.classList.remove("flashTimer");

	function updateTimer() {
		if (lockObj === true) {
			clearInterval(timeinterval);
			lockObj = false;
			return 0;
		}

		const t = getTimeRemaining(endtime);

		$(minutesSpan).text(('0' + t.minutes).slice(-2));
		$(secondsSpan).text(('0' + t.seconds).slice(-2));

		if (t.total <= 0) {
			$(timer).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
			clearInterval(timeinterval);

			const timerSound = new Audio("sounds/alarm.wav");
			timerSound.play();

			initTimer(id, endtime);
		}
	}

	updateTimer();
	const timeinterval = setInterval(updateTimer, 1000);
}

function getDeadline(val) {
	return new Date(Date.parse(new Date()) + val * 60 * 1000);
}

function startTimer() {
	const duration = $("#timer-duration").val();
	const deadline = getDeadline(duration);

	initTimer('clockdiv', deadline);

	$("#timer-slider").css("visibility", "hidden");
	$("#start-timer").css("display", "none");
	$("#stop-timer").css("display", "inline");
}

function stopTimer() {
	lockObj = true;

	$("#timer-slider").css("visibility", "visible");
	$("#stop-timer").css("display", "none");
	$("#start-timer").css("display", "inline");
}

function setCurrentValue(val) {
	const timer = $("#clockdiv")[0];

	const minutesSpan = timer.querySelector('.minutes');
	const secondsSpan = timer.querySelector('.seconds');

	const endtime = getDeadline(val);
	const t = getTimeRemaining(endtime);

	$(minutesSpan).text(('0' + t.minutes).slice(-2));
	$(secondsSpan).text(('0' + t.seconds).slice(-2));
}
