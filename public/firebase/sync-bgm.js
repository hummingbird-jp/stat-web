// const firebase = require("firebase");
// // Required for side-effects
// require("firebase/firestore");
const syncBgmDocId = "tQ4vN4gwalYtkbTI8Py3" // TODO: beta, currently a document id is given. 
var db = firebase.firestore();

db.collection("sync-bgm-beta").doc(syncBgmDocId) // listen to "currentTrackId"
    .onSnapshot((doc) => {
        console.log("Current data: ", doc.data());
        var currentTrackId = doc.data().currentTrackId;
        var currentTime = doc.data().currentTime;
        var isPlaying = doc.data().isPlaying;
        var isChanged = doc.data().isChanged;
        if (isChanged && (typeof audioElm != "undefined")) {
            var docRef = db.collection("audioSet").doc(currentTrackId);
            docRef.get().then((doc) => {
                if (doc.exists) {
                    console.log("audioSet data: ", doc.data());
                    changeTrackTo(doc.data().uri, currentTime);
                    changeSelectorTo(doc.data().value);
                    configureControlPanelPlaying();
                }
            })
        } else {
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
    });

function changeTrackTo(uri, currentTime) {
    // resetTrack();
    audioElm.src = uri;
    audioElm.pause();
    audioElm.load();
    configureDefaultAudio(audioElm);
    audioElm.currentTime = currentTime;
    audioElm.play();
}

function changeSelectorTo(value) {
    selectorObj.value = value;
    selectorObj.disabled = true;
}