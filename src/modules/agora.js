// Agora Video SDK for Web NG (stands for Next Generation; also means 4.x)
import AgoraRTC from "agora-rtc-sdk-ng"

// Bootstrap
import * as bootstrap from "bootstrap";

// Firebase
import * as auth from "firebase/auth";
import * as functions from "firebase/functions";

import * as stat_firebase from "./stat_firebase";
import * as stat_auth from "./stat_auth";
import * as agenda from "./agenda";
import * as bgm from "./bgm";
import * as meetingConfiguration from "./meeting-configuration";
import * as reaction from "./reaction";
import * as timer from "./timer";
import * as voiceVisualizer from "./voice-visualizer";
import * as utils from "./utils";

const appid = "adaa9fb7675e4ca19ca80a6762e44dd2";
const toastOptions = { animation: true, autohide: true, delay: 3000 };

let localTracks;
let client;
let published = false;
let isMicOn = true;
let isVideoOn = true;
let remoteUsers;

export async function initAgora() {
	published = false;

	client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

	localTracks = {
		videoTrack: null,
		audioTrack: null
	};

	remoteUsers = {};

	// Add an event listener to play remote tracks when remote user publishes.
	client.on("user-published", handleUserPublished);
	client.on("user-unpublished", handleUserUnpublished);
}

export async function joinWithChannelName(channelName) {
	auth.onAuthStateChanged(stat_auth.authInstance, async (userAuth) => {
		if (userAuth) {
			try {
				// Generate a token with channel name via Cloud Functions
				const generateTokenWithUid = functions.httpsCallable(stat_firebase.functionsInstance, "generateTokenWithUid",);
				const result = await generateTokenWithUid({ channelName: channelName })
				const data = result.data;

				// Don't worry, generateTokenWithUid returns a token
				stat_auth.user.token = data.token;
				// Initialize other local user information
				stat_auth.user.channel = channelName;
				stat_auth.user.uid = userAuth.uid;
				stat_auth.user.displayNameAuth = userAuth.displayName;
				stat_auth.user.displayNameStat = userAuth.displayName;

				// Join a channel and create local tracks. Best practice is to use Promise.all and run them concurrently.
				[stat_auth.user.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
					// Join the channel.
					client.join(appid, stat_auth.user.channel, stat_auth.user.token || null, stat_auth.user.uid || null),
					// Create tracks to the local microphone and camera.
					AgoraRTC.createMicrophoneAudioTrack(),
					AgoraRTC.createCameraVideoTrack(),
				]);

				// hide join panel; show up #leave button
				$("#join").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);
				$("#create").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

				// Play the local video track to the local browser and update the UI with the user ID.
				playLocalVideo();
				$("#local-player-name").text(`${stat_auth.user.displayNameStat} (You)`);

				// Publish the local video and audio tracks to the channel.
				publishLocalTracks();

				$(".join-area").hide();
				$("#copyright").hide();
				$(".meeting-area").fadeIn();
				$(".control-button-group").fadeIn();

				await stat_firebase.init();
				bgm.init();
				voiceVisualizer.init();
				reaction.init();

				stat_auth.addMyUserInfo();

				stat_auth.listenUserInfo();
				agenda.listenAgenda();
				timer.listenTimer();

				meetingConfiguration.initMeetingTimeLimit();
			} catch (error) {
				console.error(error);
				// TODO: show error and clear form
			} finally {
				$("#leave").attr("disabled", false);
			}
		} else {
			stat_auth.signin();
		}
	});
}

export function toggleMic() {
	let localAudioTrack = localTracks.audioTrack;

	if (isMicOn === false) {
		// Turn on the mic
		localAudioTrack.setEnabled(true);
		isMicOn = true;
		$("#toggle-mic").prop("checked", true);
		utils.statConsoleLog("Local audio successfully started 📣");
		utils.hideToast("muted-message");
		utils.showToast("unmuted-message");

		stat_auth.adjustMyPublishStatus("audio", true);

	} else {
		// Turn off the mic
		localAudioTrack.setEnabled(false);
		isMicOn = false;
		$("#toggle-mic").prop("checked", false);
		utils.statConsoleLog("Local audio successfully muted 🤫");
		utils.hideToast("unmuted-message");
		utils.showToast("muted-message");

		stat_auth.adjustMyPublishStatus("audio", false);

	}
}

export function toggleVideo() {
	let localVideoTrack = localTracks.videoTrack;

	if (isVideoOn === false) {
		// Turn on video
		localVideoTrack.setEnabled(true);
		isVideoOn = true;
		$("#toggle-video").prop("checked", true);
		utils.statConsoleLog("Local video successfully started 🎥");
		utils.hideToast("stop-video-message");
		utils.showToast("start-video-message");

		stat_auth.adjustMyPublishStatus("video", true);

	} else {
		// Turn off video
		localVideoTrack.setEnabled(false);
		isVideoOn = false;
		$("#toggle-video").prop("checked", false);
		utils.statConsoleLog("Local video successfully stopped 🚫");
		utils.hideToast("start-video-message");
		utils.showToast("stop-video-message");

		stat_auth.adjustMyPublishStatus("video", false);
	}
}

/*
 * Stop all local and remote tracks then leave the channel.
 */
export async function leave() {
	for (const localTrack in localTracks) {
		var track = localTracks[localTrack];
		if (track) {
			track.stop();
			track.close();
			localTracks[localTrack] = undefined;
		}
	}

	// Remove remote users and player views.
	remoteUsers = {};
	$("#remote-playerlist").html("");

	// leave the channel
	client.leave();

	$("#local-player-name").text("");
	$("#join").attr("disabled", false);
	$("#leave").attr("disabled", true);
	console.log("client leaves channel success");

	$("#leave").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	// timeout is unnecessary of course, but for better UX
	setTimeout(() => {
		$(".join-area").fadeIn();
		$("#copyright").fadeIn();
		$(".meeting-area").hide();
		$(".control-button-group").hide();
		$("#leave").html(`<img src="icons/call_end_black_24dp.svg" alt="" class="material-icons">`)
	}, 1000);

	// Firestore
	stat_auth.adjustMyActiveStatus(false);
}

/*
 * Add the local use to a remote channel.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
async function subscribe(user, mediaType) {
	const uid = user.uid;

	// subscribe to a remote user
	await client.subscribe(user, mediaType);
	console.log("subscribe success");

	if (mediaType === 'video') {
		const player = $(`
				<div id="player-wrapper-${uid}" class="col">
				<p id="player-reaction-${uid}" class="reaction-text">😀</p>
				<p class="player-name">${uid}</p>
					<div id="player-${uid}" class="player mx-auto"></div>
				</div>
		`);
		// Remove old player wrapper
		$(`#player-wrapper-${uid}`).remove();
		$("#video-group").append(player);
		user.videoTrack.play(`player-${uid}`);
	}
	if (mediaType === 'audio') {
		user.audioTrack.play();
	}
}

/*
 * Add a user who has subscribed to the live channel to the local interface.
 *
 * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
 * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
 */
function handleUserPublished(user, mediaType) {
	const id = user.uid;
	remoteUsers[id] = user;
	subscribe(user, mediaType);
}

/*
 * Remove the user specified from the channel in the local interface.
 *
 * @param  {string} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to remove.
 */
function handleUserUnpublished(user, mediaType) {
	const id = user.uid;
	delete remoteUsers[id];

	// If remote user muted
	if (mediaType === "video") {
		$(`#player-${id}`).remove();
	}
}

function playLocalVideo() {
	localTracks.videoTrack.play("local-player");
}

function publishLocalTracks() {
	client.publish(Object.values(localTracks));
	published = true;
	console.log("Local user successfully published.");
}

