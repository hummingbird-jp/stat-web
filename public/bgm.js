const audioSet = [{
        uri: "https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2Fnature_sound.mp3?alt=media&token=aff3df2f-787d-43e6-be5f-2a51cae2abef",
        category: "nature",
        caption: "Be natural"
    },
    {
        uri: "https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2FAfternoon%20Lounge%20Jazz%20-%20Relaxing%20Jazz%20Music%20for%20Work%20%26%20Study%20-%20from%20YouTube.mp3?alt=media&token=a13dec52-484e-46ab-bc00-e10f8a9d5f14",
        category: "jazz",
        caption: "Be relaxed"
    },
    {
        uri: "https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2F%E2%98%95%20Coffee%20Shop%20Noise%20for%20Studying%20_%20Pomodoro%20Technique%202%20Hours%20Timer%20-%20from%20YouTube.mp3?alt=media&token=c277349d-2c6d-47b5-b62f-241a561984d1",
        category: "buzz",
        caption: "Be focused"
    }
];

// Play bgm automatically when loaded.
const uriAudioDefault = audioSet[0].uri;

var audioElm = new Audio(uriAudioDefault);
configureDefaultAudio(audioElm);

var uriAudio = null;
const selecterObj = document.getElementById("bgm-selecter");
selecterObj.addEventListener('change', (event) => {
    const val = parseInt(event.target.value);
    uriAudio = audioSet[val].uri;
});

const playButton = document.getElementById("play-button");
const stopButton = document.getElementById("stop-button");
const playbackSpan = document.getElementById("playback-span");

// play/pause audio
playButton.addEventListener('click', function() {

    if (this.dataset.playing === "preSelect") {
        if (uriAudio === null) {
            console.log("BGM not selected.");
        } else {
            audioElm.src = uriAudio;
            audioElm.pause()
            audioElm.load();
            configureDefaultAudio(audioElm);
            this.dataset.playing = "true";

            stopButton.disabled = false;
            stopButton.dataset.stateStop = "false";

            playbackSpan.textContent = "Pause";
            selecterObj.disabled = true;
        }
    } else if (this.dataset.playing === 'false') {
        audioElm.play();
        this.dataset.playing = 'true';
        playbackSpan.textContent = "Pause";

        selecterObj.disabled = true;
    } else if (this.dataset.playing === 'true') {
        audioElm.pause();
        this.dataset.playing = 'false';
        playbackSpan.textContent = "Play";

        stopButton.disabled = false;
    }

    let state = this.getAttribute('aria-checked') === "true" ? true : false;
    this.setAttribute('aria-checked', state ? "false" : "true");

}, false);

stopButton.addEventListener("click", function() {
    audioElm.pause();
    audioElm.currentTime = 0;
    configureDefaultControlPanel();
});

function configureDefaultAudio(audioElm) {
    audioElm.preload = 'none';
    audioElm.loop = true;
    audioElm.autoplay = true;
    audioElm.volume = 0.05;
}

function configureDefaultControlPanel() {
    stopButton.disabled = true;
    selecterObj.disabled = false;
    selecterObj.value = "default";
    playbackSpan.textContent = "Play";
    playButton.dataset.playing = "preSelect";
}