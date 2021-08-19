/*
 * Need to allocate uri to Audio element when created.
 * So one of the BGMs is allocated as default, but it is not played.
 */
const uriAudioDefault = "https://firebasestorage.googleapis.com/v0/b/stat-web-6372a.appspot.com/o/bgm%2Fnature_sound.mp3?alt=media&token=aff3df2f-787d-43e6-be5f-2a51cae2abef";

const audioElm = new Audio(uriAudioDefault);
configureAudioDefault(audioElm);

const selectorObj = $("#bgm-selector")[0];
const playButton = $("#play-button")[0];
const stopButton = $("#stop-button")[0];
const playbackSpan = $("#playback-span")[0];

/*
 * Firestore related constants
 * TODO: syncBgmDocId is beta, currently a document id is given. 
 */
const syncBgmDocId = "tQ4vN4gwalYtkbTI8Py3";
const syncBgmCollection = "sync-bgm-beta";
const audioSetCollection = "audioSet";

/*
 * Stop BGM when left.
 */
$("#leave").click(function(e) {
    audioElm.pause();
});

/*
 * Send BGM status to database (Firestore)
 */
playButton.addEventListener('click', function() {

    const currentTime = audioElm.currentTime;

    if (this.dataset.playing === "preSelect") {
        if (selectorObj.value === "default") {
            console.log("BGM not selected.");
        } else {
            sendBgmStatus(0, true, true);
        }
    } else if (this.dataset.playing === 'false') { // when "Play" clicked
        sendBgmStatus(currentTime, false, true);

    } else if (this.dataset.playing === 'true') { // when "Pause" clicked
        sendBgmStatus(currentTime, false, false);

    }

    let state = this.getAttribute('aria-checked') === "true" ? true : false;
    this.setAttribute('aria-checked', state ? "false" : "true");

}, false);

stopButton.addEventListener("click", function() {
    configureControlPanelDefault();
});

db.collection(syncBgmCollection).doc(syncBgmDocId) // listen to "currentTrackId"
    .onSnapshot((doc) => {

        // Only for debugging
        // console.log("Current data: ", doc.data());

        const currentTrackId = doc.data().currentTrackId;
        const currentTime = doc.data().currentTime;
        const isPlaying = doc.data().isPlaying;
        const isChanged = doc.data().isChanged;

        if (!$(".meeting-area").is(":hidden")) {

            if (isChanged) {

                const docRef = db.collection(audioSetCollection).doc(currentTrackId);

                docRef.get().then((doc) => {
                    if (doc.exists) {

                        // Only for debugging
                        // console.log("audioSet data: ", doc.data());

                        changeTrackTo(doc.data().uri, currentTime);
                        changeSelectorTo(doc.data().category);
                        configureControlPanelPlaying();
                    }
                })
            } else {
                /*
                 * If audio track is not changed but paused or resumed
                 */
                if (isPlaying) {
                    audioElm.currentTime = currentTime;
                    audioElm.play()
                    configureControlPanelPlaying();
                } else {
                    audioElm.pause();
                    audioElm.currentTime = currentTime;
                    configureControlPanelPaused();
                }
            }
        }
    });

function sendBgmStatus(currentTime, isChanged, isPlaying) {
    const category = selectorObj.value;

    // Only for debugging
    // console.log("category: ", category);

    db.collection(audioSetCollection).where("category", "==", category)
        .limit(1)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {

                // Only for debugging
                // console.log(doc.id, " => ", doc.data());

                const currentTrackId = doc.id;
                db.collection(syncBgmCollection).doc(syncBgmDocId).set({
                    currentTime: currentTime,
                    currentTrackId: currentTrackId,
                    isChanged: isChanged,
                    isPlaying: isPlaying
                })
            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });
}

function configureAudioDefault(audioElm) {
    audioElm.preload = 'none';
    audioElm.loop = true;
    audioElm.autoplay = false;
    audioElm.volume = 0.05;
}

function configureControlPanelDefault() {
    stopButton.disabled = true;
    selectorObj.disabled = false;
    selectorObj.value = "default";
    playbackSpan.textContent = "Play";
    playButton.dataset.playing = "preSelect";
}

function configureControlPanelPlaying() {
    playbackSpan.textContent = "Pause";
    playButton.dataset.playing = 'true';
    stopButton.disabled = true;
    selectorObj.disabled = true;
}

function configureControlPanelPaused() {
    playbackSpan.textContent = "Play";
    playButton.dataset.playing = 'false';
    stopButton.disabled = false;
    selectorObj.disabled = true;
}

function changeTrackTo(uri, currentTime) {
    audioElm.src = uri;
    audioElm.pause();
    audioElm.load();
    configureAudioDefault(audioElm);
    audioElm.currentTime = currentTime;
    audioElm.play();
}

function changeSelectorTo(value) {
    selectorObj.value = value;
    selectorObj.disabled = true;
}