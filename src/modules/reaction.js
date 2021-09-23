import * as firestore from "@firebase/firestore";
import * as stat_firebase from "./stat_firebase";
import * as stat_auth from "./stat_auth";
import * as utils from './utils';
import * as _ from "..";

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

const videoElm = document.createElement("video");
let blazeFaceModel;

export function clap() {
	const haystack = $("#local-player-reaction").text();
	const needle = "👏";
	const myClapCount = (haystack.match(new RegExp(needle, "g")) || []).length;

	// Ignore if clap count is higher than five
	if (myClapCount > 5) return;

	$("#local-player-reaction").append("👏");
	sendMyReaction($("#local-player-reaction").text());
}

const reactionModule = (function () {
	let reactionMethods = {};
	let renderFrame;
	let shouldContinue = true;

	reactionMethods.init = async function () {

		// Set up camera
		navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false
		}).then(stream => {
			videoElm.srcObject = stream;
			utils.statConsoleLog(`Video for reaction.js is ready.`)
		}).catch(err => {
			console.error(`Error: ${err}`);
		});

		blazeFaceModel = await blazeface.load();

		shouldContinue = true;

		const bufferLength = 32;
		const dataArrayX = new Array(bufferLength).fill(0); // 左右 = "No"
		const dataArrayY = new Array(bufferLength).fill(0); // 上下 = "Yes" Nodding

		// For the detector
		let eyeMovedLog = [];
		let detector = 0;
		const threshold = 3; // 閾値 "Are you nodding?"判定が3回でうなずいたことになる
		const windowSize = 256; // 更新時間
		let nodWindow = windowSize;

		videoElm.play();
		const renderPrediction = async function () {
			renderFrame = requestAnimationFrame(renderPrediction);

			if (!shouldContinue) {
				cancelAnimationFrame(renderFrame);
			}

			// BlazeFace options
			const returnTensors = false;
			const flipHorizontal = false;
			const annotateBoxes = true;
			const predictions = await blazeFaceModel.estimateFaces(
				videoElm,
				returnTensors,
				flipHorizontal,
				annotateBoxes
			)

			if (predictions.length > 0) {
				const x = predictions[0].landmarks[0][0]; // right eye x
				const y = predictions[0].landmarks[0][1]; // right eye y
				dataArrayX.shift();
				dataArrayY.shift();
				dataArrayX.push(x);
				dataArrayY.push(y);
			}

			// Normalize data (each_data - average)
			const arrayY = normalize(dataArrayY);

			// Judge nodding
			const Fx = fft0(arrayY);
			const watchingIdx = 1; // Pay attention to index = 1
			const amplitude = Math.sqrt(Fx[watchingIdx][0] ^ 2 + Fx[watchingIdx][1] ^ 2);

			if (amplitude > 9 && amplitude < 16) {

				eyeMovedLog.push(amplitude);
				const sum = eyeMovedLog.reduce((a, b) => a + b);

				if (sum > 80) {
					//console.log(eyeMovedLog.length, sum);
					//console.log("%c are you nodding?", 'color: #0583F2');
					eyeMovedLog = [];
					detector += 1;
				}
			}

			nodWindow -= 1;
			if (nodWindow === 0) {
				eyeMovedLog = [];
				detector = 0;
				nodWindow = windowSize;
				//console.log('%c detector reset ', 'color: #BF1F5A');
				const currentReaction = $("#local-player-reaction").text();
				if (currentReaction != '😀') {
					$("#local-player-reaction").text("😀");
					sendMyReaction($("#local-player-reaction").text());
				}
			}

			if (detector >= threshold) {
				eyeMovedLog = [];
				detector = 0;
				//console.log('%c You are nodding! ', 'background: #222; color: #bada55');
				$("#local-player-reaction").append("👍");
				sendMyReaction($("#local-player-reaction").text());
			}
		};

		renderPrediction();
	}

	reactionMethods.stop = function () {
		shouldContinue = false;

		navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false
		}).then(
			function (stream) {
				const tracks = stream.getTracks();
				tracks.forEach(function (track) {
					track.stop();
					utils.statConsoleLog("log : track stopped");
				});
			})
			.catch(function (err) { console.error('The following gUM error occured: ' + err); })
	}

	return reactionMethods;
})();

// TODO: use buttons or other controller to init and begin.
export function init() {
	reactionModule.init();
}

/*
 * Utility functions
 */
function normalize(array) {
	let result = new Array(array.length);
	const avg = array.reduce((a, b) => a + b) / array.length;

	for (let i = 0; i < array.length; i++) {
		result[i] = array[i] - avg;
	}

	return result;
}

/*
 * Fast Fourier Transform
 */
function expi(theta) { return [Math.cos(theta), Math.sin(theta)]; }
function iadd([ax, ay], [bx, by]) { return [ax + bx, ay + by]; }
function isub([ax, ay], [bx, by]) { return [ax - bx, ay - by]; }
function imul([ax, ay], [bx, by]) { return [ax * bx - ay * by, ax * by + ay * bx]; }
function isum(cs) { return cs.reduce((s, c) => iadd(s, c), [0, 0]); }

function fftrec(c, T, N, s = 0, w = 1) {
	if (N === 1) return [c[s]];
	const Nh = N / 2, Td = T * 2, wd = w * 2;
	const rec = fftrec(c, Td, Nh, s, wd).concat(fftrec(c, Td, Nh, s + w, wd));
	for (let i = 0; i < Nh; i++) {
		const l = rec[i], re = imul(rec[i + Nh], expi(T * i));
		[rec[i], rec[i + Nh]] = [iadd(l, re), isub(l, re)];
	}
	return rec;
}

function fft0(freal) {
	// real array to complex array
	const f = freal.map(r => [r, 0]);

	const N = f.length, T = -2 * Math.PI / N;
	return fftrec(f, T, N);
}

function sendMyReaction(text) {
	const docRef = firestore.doc(stat_firebase.meetingDocRef, stat_firebase.usersCollection, stat_auth.user.uid);
	firestore.updateDoc(docRef, {
		reaction: text
	});
}
