import * as bootstrap from "bootstrap";

import * as stat_firebase from "./stat_firebase";
import * as stat_auth from "./stat_auth";
import * as agenda from "./agenda";
import * as bgm from "./bgm";
import * as meetingConfiguration from "./meeting-configuration";
import * as reaction from "./reaction";
import * as timer from "./timer";
import * as voiceVisualizer from "./voice-visualizer";

const appid = "adaa9fb7675e4ca19ca80a6762e44dd2";
const toastOptions = { animation: true, autohide: true, delay: 3000 };

let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let published = false;
let localTracks;
let remoteUsers;
let meetingId;

export function initAgora() {
	published = false;

	client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

	localTracks = {
		videoTrack: null,
		audioTrack: null
	};

	remoteUsers = {};
}

/**
 * @deprecated A channel name will be replaced with document ID on Firestore soon.
 */
export function generateRandomChannelName(length) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;

	let result = '';

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() *
			charactersLength));
	}

	return result;
}

export async function joinOrCreate(token) {
	meetingId = generateMeetingId(token);

	// Add an event listener to play remote tracks when remote user publishes.
	client.on("user-published", handleUserPublished);
	client.on("user-unpublished", handleUserUnpublished);

	// hide join panel; show up #leave button
	$("#join").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);
	$("#create").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	// Join a channel and create local tracks. Best practice is to use Promise.all and run them concurrently.
	[stat_auth.user.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
		// Join the channel.
		client.join(appid, stat_auth.user.channel, stat_auth.user.token || null, stat_auth.user.uid || null),
		// Create tracks to the local microphone and camera.
		AgoraRTC.createMicrophoneAudioTrack(),
		AgoraRTC.createCameraVideoTrack()
	]);

	// Play the local video track to the local browser and update the UI with the user ID.
	localTracks.videoTrack.play("local-player");
	$("#local-player-name").text(`${stat_auth.user.displayNameStat} (You)`);

	// Publish the local video and audio tracks to the channel.
	client.publish(Object.values(localTracks));
	published = true;
	console.log("Local user successfully published.");

	$(".join-area").hide();
	$("#copyright").hide();
	$(".meeting-area").fadeIn();
	$(".control-button-group").fadeIn();
	$("#join").text("Join");
	$("#create").text("Create");
	$("#create").attr("disabled", false);

	await stat_firebase.init(meetingId);
	bgm.init();
	voiceVisualizer.init();
	reaction.init();

	stat_auth.addMyUserInfo();

	stat_auth.listenUserInfo();
	agenda.listenAgenda();
	timer.listenTimer();

	meetingConfiguration.initMeetingTimeLimit();
}

export async function unpublish() {
	const unpublishedMessageElement = new bootstrap.Toast($('#unpublished-message'), toastOptions);
	const publishedMessageElement = new bootstrap.Toast($('#published-message'), toastOptions);

	// Firestore Update
	stat_auth.adjustMyActiveStatus(published);

	if (published === true) {
		// Unpublish the user
		client.unpublish(Object.values(localTracks));
		published = false;

		$('.available-only-published').attr('disabled', true);
		$('.visible-only-published').hide();

		// Show toast message
		unpublishedMessageElement.show();
		publishedMessageElement.hide();

	} else {
		// Publish the user
		client.publish(Object.values(localTracks));
		published = true;

		$('.available-only-published').attr('disabled', false);
		$('.visible-only-published').show();

		// Show toast message
		unpublishedMessageElement.hide();
		publishedMessageElement.show();
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
	client.subscribe(user, mediaType);
	console.log("subscribe success");

	if (mediaType === 'video') {
		const player = $(`
				<div id="player-wrapper-${uid}" class="col">
					<p id="player-reaction-${uid}" class="reaction-text">😀</p>
					<p class="player-name">${uid}</p>
					<div id="player-${uid}" class="player mx-auto"></div>
				</div>
		`);
		$("#video-group").append(player);
		user.videoTrack.play(`player-${uid}`);
	}
	if (mediaType === 'audio') {
		user.audioTrack.play();
	}
}

/**
 * @deprecated Meeting ID (equals document ID) on Firestore will be generated automatically by Firestore.
 */
function generateMeetingId(token) {
	return token.replaceAll('/', '');
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
function handleUserUnpublished(user) {
	const id = user.uid;
	delete remoteUsers[id];

	$(`#player-wrapper-${id}`).remove();
}
