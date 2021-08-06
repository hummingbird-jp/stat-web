var lockObj = false;

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
        if (lockObj == true) {
            clearInterval(timeinterval);
            lockObj = false;
            return 0;
        }

        const t = getTimeRemaining(endtime);

        minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
        secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);

        if (t.total <= 0) {
            clearInterval(timeinterval);
            clock.classList.add("flashTimer");
        }
    }

    updateClock();
    const timeinterval = setInterval(updateClock, 1000);
}

function getDeadline(val) {
    const deadline = new Date(Date.parse(new Date()) + val * 60 * 1000);
    return deadline;
}

function startTimer() {
    var duration = document.getElementById("timer-duration").value;
    var deadline = getDeadline(duration);
    initializeClock('clockdiv', deadline);
    document.getElementById("timer-slider").style.visibility = "hidden";
    document.getElementById("start-timer").style.display = "none";
    document.getElementById("stop-timer").style.display = "inline";
}

function stopTimer() {
    lockObj = true;
    document.getElementById("timer-slider").style.visibility = "visible";
    document.getElementById("stop-timer").style.display = "none";
    document.getElementById("start-timer").style.display = "inline";
}

// slider functions
const sliderInputElem = document.getElementById("timer-duration");

function setCurrentValue(val) {
    const clock = document.getElementById("clockdiv");

    const minutesSpan = clock.querySelector('.minutes');
    const secondsSpan = clock.querySelector('.seconds');

    const endtime = getDeadline(val);
    const t = getTimeRemaining(endtime);
    minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
    secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);
}

function rangeOnChange(e) {
    setCurrentValue(e.target.value);
}

window.onload = () => {
    sliderInputElem.addEventListener('input', rangeOnChange);
    setCurrentValue(sliderInputElem.value);
}