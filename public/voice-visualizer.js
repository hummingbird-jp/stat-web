// document.body.addEventListener('click', init);
$("#join").click(function() {
    initTalkVisualizer();
});

function initTalkVisualizer() {
    // document.body.removeEventListener('click', init)

    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
        navigator.mediaDevices = {};
    }


    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
        navigator.mediaDevices.getUserMedia = function(constraints) {

            // First get ahold of the legacy getUserMedia, if present
            const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

            // Some browsers just don't implement it - return a rejected promise with an error
            // to keep a consistent interface
            if (!getUserMedia) {
                return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
            }

            // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
            return new Promise(function(resolve, reject) {
                getUserMedia.call(navigator, constraints, resolve, reject);
            });
        }
    }

    // set up forked web audio context, for multiple browsers
    // window. is needed otherwise Safari explodes

    const audioCtx = new(window.AudioContext || window.webkitAudioContext)();
    // console.log("Sampling rate: ", audioCtx.sampleRate);
    // const voiceSelect = document.getElementById("voice");
    let source;
    let stream;


    //set up the different audio nodes we will use for the app

    const analyser = audioCtx.createAnalyser();
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;

    // set up canvas context for visualizer

    const canvas = document.getElementById("voice-visualizer");
    const canvasCtx = canvas.getContext("2d");

    const intendedWidth = document.querySelector('.col-md-6').clientWidth;
    canvas.setAttribute('width', intendedWidth);

    const visualSelect = document.getElementById("visual");

    let drawVisual;

    /*
     * Variables for talk amount observer
     */
    const talkCanvas = document.getElementById("talk-amount-visualizer");
    const talkCanvasCxt = talkCanvas.getContext("2d");
    const talkDataBufferLength = 1024;
    const talkDataArray = new Array(talkDataBufferLength).fill(0);
    const talkDataSendTrigger = new Array(talkDataBufferLength).fill(0);
    let isTalking = false;

    talkCanvas.setAttribute("width", intendedWidth);
    talkDataSendTrigger[talkDataSendTrigger.length - 1] = 1;

    //main block for doing the audio recording

    if (navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia supported.');
        const constraints = { audio: true }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(
                function(stream) {
                    source = audioCtx.createMediaStreamSource(stream);
                    source.connect(analyser);
                    visualize();
                })
            .catch(function(err) { console.log('The following gUM error occured: ' + err); })
    } else {
        console.log('getUserMedia not supported on your browser!');
    }

    function visualize() {
        const WIDTH = canvas.width;
        const HEIGHT = canvas.height;


        const visualSetting = visualSelect.value;
        // console.log(visualSetting);

        if (visualSetting === "sinewave") {
            analyser.fftSize = 2048;
            const bufferLength = analyser.fftSize;
            // console.log(bufferLength);
            const dataArray = new Uint8Array(bufferLength);

            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            const draw = function() {

                drawVisual = requestAnimationFrame(draw);

                analyser.getByteTimeDomainData(dataArray);

                canvasCtx.fillStyle = 'rgb(200, 200, 200)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

                canvasCtx.beginPath();

                const sliceWidth = WIDTH * 1.0 / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {

                    const v = dataArray[i] / 128.0;
                    const y = v * HEIGHT / 2;

                    if (i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(canvas.width, canvas.height / 2);
                canvasCtx.stroke();
            };

            draw();

        } else if (visualSetting == "frequencybars") {
            analyser.fftSize = 256;
            const bufferLengthAlt = analyser.frequencyBinCount;
            // console.log(bufferLengthAlt);

            const freqRes = (audioCtx.sampleRate / 2) / bufferLengthAlt;
            // console.log("Frequency resolution: ", freqRes, " Hz")

            const dataArrayAlt = new Uint8Array(bufferLengthAlt);

            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            const drawAlt = function() {
                drawVisual = requestAnimationFrame(drawAlt);

                analyser.getByteFrequencyData(dataArrayAlt);

                canvasCtx.fillStyle = 'rgb(0, 0, 0)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                const barWidth = (WIDTH / bufferLengthAlt) * 2.5;
                let barHeight;
                let x = 0;

                const audioFreqAvg = dataArrayAlt.reduce((a, b) => a + b) / bufferLengthAlt;
                const start = Math.ceil(100 / freqRes);
                const end = Math.ceil(400 / freqRes)
                const voiceVolume = dataArrayAlt.slice(start, end).reduce((a, b) => a + b) / (end - start);

                for (let i = 0; i < bufferLengthAlt; i++) {
                    barHeight = dataArrayAlt[i];

                    canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
                    if (i > Math.ceil(100 / freqRes) && i < Math.ceil(400 / freqRes) + 1) {
                        if (barHeight > audioFreqAvg && barHeight > 80) {
                            isTalking = true;
                            canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',255,60)';
                        } else {
                            isTalking = false;
                            canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',60,60)';
                        }
                    }
                    canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight / 2);

                    x += barWidth + 1;
                }

                /*
                 * Update talkDataArray and draw
                 */
                talkDataArray.shift();
                if (isTalking) {
                    talkDataArray.push(voiceVolume);
                } else {
                    talkDataArray.push(0);
                }
                talkCanvasCxt.fillStyle = 'rgb(200, 200, 200)';
                talkCanvasCxt.fillRect(0, 0, WIDTH, HEIGHT);

                talkCanvasCxt.lineWidth = 2;
                talkCanvasCxt.strokeStyle = 'rgb(0, 0, 0)';

                talkCanvasCxt.beginPath();

                const sliceWidth = WIDTH * 1.0 / talkDataArray.length;
                let x2 = 0;

                for (let i = 0; i < talkDataArray.length; i++) {

                    const v = talkDataArray[i] / 256.0;
                    const y = (1 - v) * HEIGHT;

                    if (i === 0) {
                        talkCanvasCxt.moveTo(x2, y);
                    } else {
                        talkCanvasCxt.lineTo(x2, y);
                    }

                    x2 += sliceWidth;
                }

                talkCanvasCxt.lineTo(talkCanvas.width, talkCanvas.height / 2);
                talkCanvasCxt.stroke();

                /*
                 * Update talkDataSendTrigger
                 */
                talkDataSendTrigger.shift();
                if (talkDataSendTrigger[0] === 1) {
                    const talkDataAvg = talkDataArray.reduce((a, b) => a + b) / talkDataArray.length;
                    sendTalkDataToFirebase(talkDataAvg);
                    console.log("trigger! Your talkDataAvg: ", talkDataAvg);

                    talkDataSendTrigger.push(1);
                    getTalkDataFromFirebase();
                } else {
                    talkDataSendTrigger.push(0);
                }
            };

            drawAlt();

        } else if (visualSetting == "off") {
            canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            canvasCtx.fillStyle = "#262626";
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        }

    }

    // event listeners to change visualize

    visualSelect.onchange = function() {
        window.cancelAnimationFrame(drawVisual);
        visualize();
    };
}

function sendTalkDataToFirebase(value) {
    const timestamp = firebase.firestore.Timestamp.now();
    const userName = $("#userName").val();

    db.collection("sync-talkdata-beta").add({
        timestamp: timestamp,
        talkValue: value,
        userName: userName
    })
}

function getTalkDataFromFirebase() {
    const userNames = ["Ryutaro Suda", "Yusuke Hakamaya", "Natsumi Aoyama"];
    let sums = new Array(userNames.length).fill(0);
    db.collection("sync-talkdata-beta").orderBy("timestamp", "desc")
        .limit(10)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                for (let i = 0; i < userNames.length; i++) {
                    if (doc.data().userName === userNames[i]) {
                        sums[i] += doc.data().talkValue;
                    }
                }
            })
            for (let i = 0; i < userNames.length; i++) {
                console.log(userNames[i], " : ", Math.round(sums[i]));
            }
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });
}