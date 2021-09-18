import * as bootstrap from "bootstrap";

import * as stat_firebase from "./modules/stat_firebase";
import * as stat_auth from "./modules/stat_auth";
import * as agenda from "./modules/agenda";
import * as bgm from "./modules/bgm";
import * as reaction from "./modules/reaction";
import * as timer from "./modules/timer";
import * as voiceVisualizer from "./modules/voice-visualizer";
import * as meetingConfiguration from "./modules/meeting-configuration";

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

const appUrl = $(location).attr('href');
const appid = "adaa9fb7675e4ca19ca80a6762e44dd2";
const toastOptions = { animation: true, autohide: true, delay: 3000 };

let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let published = false;
let localTracks;
let remoteUsers;
let meetingId;

initScreen();
initAgora();

$("#sign-in-with-google").on("click", async function () {
	await stat_auth.signin();
	// TODO: show error screen if log in failed

	// Judge if user already has meeting token as URL parameters
	const urlParams = new URL(appUrl).searchParams;

	stat_auth.user.token = urlParams.get("token");
	stat_auth.user.channel = urlParams.get("channel");


	if (stat_auth.user.token && stat_auth.user.channel) {
		stat_auth.user.token = stat_auth.user.token.replaceAll(' ', '+');
		stat_auth.user.uid = generateUid();

		// Show #userNameJoin
		setTimeout(() => {
			$("#sign-in-with-google").hide();
			$("#join-form").css("display", "unset");
			$('#userNameJoin').trigger("focus");
		}, 2000);
	} else {
		// Show #userNameCreate
		setTimeout(() => {
			$("#sign-in-with-google").hide();
			$("#create-form").css("display", "unset");
			$('#userNameCreate').trigger("focus");
		}, 2000);
	}
});

// Join existing meeting
$("#join-form").on('submit', async function (e) {
	e.preventDefault();
	$("#join").attr("disabled", true);

	try {
		stat_auth.user.displayNameStat = $("#userNameJoin").val();

		await joinOrCreate(stat_auth.user.token);
	} catch (error) {
		console.error(error);
		// TODO: show error and clear form
	} finally {
		$("#leave").attr("disabled", false);
	}
});

// Create a new meeting
$("#create-form").on('submit', async function (e) {
	e.preventDefault();
	$("#create").attr("disabled", true);

	try {
		const channelName = generateRandomChannelName(20);

		stat_auth.user.channel = channelName;
		stat_auth.user.displayNameStat = $("#userNameCreate").val();
		stat_auth.user.token = await fetchNewTokenWithChannelName(channelName);

		await joinOrCreate(stat_auth.user.token);
	} catch (error) {
		console.error(error);
		// TODO: show error and clear form
	} finally {
		$("#leave").attr("disabled", false);
	}
});

// Agenda
const setAgendaButton = $('#set-agenda')[0];

$(setAgendaButton).on('click', function (e) {
	const newAgenda = $("#agenda-in").val();

	$("#agenda-out").text(newAgenda);
	agenda.sendAgenda(newAgenda);
});

// Timer
$("#timer-slider").on("input", (e) => {
	const text = ('0' + e.target.value).slice(-2) + ':00';
	$("#timer-static p").text(text);
});

$('#start-timer').on('click', function () {
	$('#start-timer').attr('disabled', true);
	$("#start-timer").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	setTimeout(() => {
		$("#timer-slider").css("visibility", "hidden");
		$("#start-timer").css("display", "none");
		$("#stop-timer").css("display", "inline");
		$('#start-timer').html(`<img src="icons/play_arrow_black_24dp.svg" alt="" class="material-icons">`);
		$('#start-timer').attr('disabled', false);
	}, 1000);

	const durationMin = $("#timer-slider").val();
	timer.sendTimer(true, durationMin);
});

$('#stop-timer').on('click', function () {
	$('#stop-timer').attr('disabled', true);
	$("#stop-timer").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`)

	setTimeout(() => {
		$('#stop-timer').html(`<img src="icons/stop_black_24dp.svg" alt="" class="material-icons">`);
		$("#timer-slider").css("visibility", "visible");
		$("#stop-timer").css("display", "none");
		$("#start-timer").css("display", "inline");
		$('#stop-timer').attr('disabled', false);
	}, 1000);

	timer.sendTimer(false, 0);
});

// Share to Others
async function fetchNewTokenWithChannelName(channelName) {
	const uid = 1234;
	let token;

	await $.getJSON(`https://stat-web.herokuapp.com/access_token?channel=${channelName}`,
		function (data) {
			token = data.token;
		}
	);

	console.log(`uid: ${uid}`);
	console.log(`channelName: ${channelName}`);
	console.log(`token: ${token}`);

	return token;
}

function generateRandomChannelName(length) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;

	let result = '';

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() *
			charactersLength));
	}

	return result;
}

// Unpublish the local video and audio tracks to the channel when the user down the button #unpublish
$("#unpublish").on("click", async function () {
	await unpublish();
});

async function unpublish() {
	const unpublishedMessageElement = new bootstrap.Toast($('#unpublished-message'), toastOptions);
	const publishedMessageElement = new bootstrap.Toast($('#published-message'), toastOptions);

	if (published === true) {
		// Unpublish the user
		await client.unpublish(Object.values(localTracks));
		published = false;

		$('.available-only-published').attr('disabled', true);
		$('.visible-only-published').hide();

		// Show toast message
		unpublishedMessageElement.show();
		publishedMessageElement.hide();
	} else {
		// Publish the user
		await client.publish(Object.values(localTracks));
		published = true;

		$('.available-only-published').attr('disabled', false);
		$('.visible-only-published').show();

		// Show toast message
		unpublishedMessageElement.hide();
		publishedMessageElement.show();
	}
}

function initScreen() {
	$('#join-form').css('display', 'none');
	$('#create-form').css('display', 'none');

	$(".meeting-area").hide();
	$(".control-button-group").hide();
}

function initAgora() {
	published = false;

	client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

	localTracks = {
		videoTrack: null,
		audioTrack: null
	};

	remoteUsers = {};
}

/*
 * Join a channel, then create local video and audio tracks and publish them to the channel.
 */
async function joinOrCreate(token) {
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

	// Show token and password
	const shortenedToken = truncate(stat_auth.user.token, 10);
	const shortenedChannelName = truncate(stat_auth.user.channel, 10);

	$("#token-and-password").html(`Token: ${shortenedToken}<br>Password: ${shortenedChannelName}`);

	// Publish the local video and audio tracks to the channel.
	await client.publish(Object.values(localTracks));
	published = true;
	console.log("publish success");

	$(".join-area").hide();
	$(".meeting-area").fadeIn();
	$(".control-button-group").fadeIn();
	$("#join").text("Join");
	$("#create").text("Create");
	$("#create").attr("disabled", false);

	await stat_firebase.initFirestore(meetingId);
	bgm.init();
	voiceVisualizer.initTalkVisualizer();
	reaction.initReactionDetector();

	stat_auth.addMyUserInfo();

	stat_auth.listenUserInfo();
	agenda.listenAgenda();
	timer.listenTimer();

	meetingConfiguration.initMeetingTimeLimit();
}

function truncate(str, n) {
	return (str.length > n) ? `${str.substr(0, n - 1)} &hellip;` : str;
};

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
	await client.leave();

	$("#local-player-name").text("");
	$("#join").attr("disabled", false);
	$("#leave").attr("disabled", true);
	console.log("client leaves channel success");

	$("#leave").html(`<img src="icons/hourglass_empty_black_24dp.svg" alt="" class="material-icons">`);

	// timeout is unnecessary of course, but for better UX
	setTimeout(() => {
		$(".join-area").fadeIn();
		$(".meeting-area").hide();
		$(".control-button-group").hide();
		$("#leave").html(`<img src="icons/call_end_black_24dp.svg" alt="" class="material-icons">`)
	}, 1000);

	// Firestore
	stat_auth.deactivateMe();
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
		$("#video-group").append(player);
		user.videoTrack.play(`player-${uid}`);
	}
	if (mediaType === 'audio') {
		user.audioTrack.play();
	}
}

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

// Control Button Group
// Handle keypress events
$(window).on("keypress", async function (e) {
	// ignore if "#agenda-in" is focused
	const isTyping = $("#agenda-in").is(":focus");

	if (isTyping === true) {
		console.log(`Keypress ignored because typing.`);
		return;
	}

	switch (e.key) {
		case "c":
			reaction.clap();
			break;
		case "s":
			const text = generateShareUrl();
			const tooltip = $("#meeting-infos-tooltip");

			copyTextToClipboard(text, tooltip);
			break;
		case "m":
			await unpublish();
			break;
		case "l":
			leave();
			break;
		default:
			break;
	}
});

// Click "Clap!" to clap
$("#clap").on("click", function () {
	reaction.clap();
});

// Click "Share" to copy
$("#copy-infos-to-clipboard").on("click", function () {
	copyTextToClipboard();
});

// Revert tooltip text to "Share (S)"
$("#copy-infos-to-clipboard").on("mouseout", function () {
	const tooltip = $("#meeting-infos-tooltip");

	$(tooltip).html("Share (S)");
});

// Copy share url to clipboard
function copyTextToClipboard(text, tooltip) {
	navigator.clipboard.writeText(text);

	$(tooltip).html(`Copied!`);
}

function generateShareUrl() {
	return `${appUrl}?token=${stat_auth.user.token}&channel=${stat_auth.user.channel}`;
}

function generateUid() {
	let uid = '0000000000';

	return parseInt((uid + Math.floor(Math.random() * 1000000000)).slice(-10));
}

// Leave
$("#leave").on('click', function (e) {
	leave();
});
