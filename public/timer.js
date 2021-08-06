const sliderInputElem = $("#timer-duration")[0];
let lockObj = false;

$(sliderInputElem).on("input", () => setCurrentValue(e.target.value));
setCurrentValue(sliderInputElem.value);

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

function initializeClock(id, endtime) {
	const clock = document.getElementById(id);

	const minutesSpan = clock.querySelector('.minutes');
	const secondsSpan = clock.querySelector('.seconds');

	clock.classList.remove("flashTimer");

	function updateClock() {
		if (lockObj === true) {
			clearInterval(timeinterval);
			lockObj = false;
			return 0;
		}

		const t = getTimeRemaining(endtime);

		$(minutesSpan).text(('0' + t.minutes).slice(-2));
		$(secondsSpan).text(('0' + t.seconds).slice(-2));

		if (t.total <= 0) {
			clearInterval(timeinterval);
			clock.classList.add("flashTimer");
		}
	}

	updateClock();
	const timeinterval = setInterval(updateClock, 1000);
}

function getDeadline(val) {
	return new Date(Date.parse(new Date()) + val * 60 * 1000);
}

function startTimer() {
	const duration = $("#timer-duration").val();
	const deadline = getDeadline(duration);

	initializeClock('clockdiv', deadline);

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
	const clock = $("#clockdiv")[0];

	const minutesSpan = clock.querySelector('.minutes');
	const secondsSpan = clock.querySelector('.seconds');

	const endtime = getDeadline(val);
	const t = getTimeRemaining(endtime);

	$(minutesSpan).text(('0' + t.minutes).slice(-2));
	$(secondsSpan).text(('0' + t.seconds).slice(-2));
}
