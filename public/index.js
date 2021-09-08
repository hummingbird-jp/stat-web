const appUrl = 'https://stat-web-6372a.web.app/';

let client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let published = false;
let localTracks;
let remoteUsers;
let options;
let meetingId;

initScreen();
initAgora();

$(() => {
	var urlParams = new URL(location.href).searchParams;

	options.token = urlParams.get("token");
	options.channel = urlParams.get("channel");

	if (options.token && options.channel) {
		options.token = options.token.replaceAll(' ', '+');
		options.uid = generateUid();

		// Show #userNameJoin
		$("#join-form").css("display", "unset");
	} else {
		// Show #userNameCreate
		$("#create-form").css("display", "unset");
	}
});

// Join existing meeting
$("#join-form").submit(async function (e) {
	e.preventDefault();
	$("#join").attr("disabled", true);

	try {
		options.userName = $("#userNameJoin").val();

		await joinOrCreate(options.token);
	} catch (error) {
		console.error(error);
		// TODO: show error and clear form
	} finally {
		$("#leave").attr("disabled", false);
	}
});

// Create a new meeting
$("#create-form").submit(async function (e) {
	e.preventDefault();
	$("#create").attr("disabled", true);

	try {
		const channelName = generateRandomChannelName(20);

		options.channel = channelName;
		options.userName = $("#userNameCreate").val();
		options.token = await fetchNewTokenWithChannelName(channelName);

		await joinOrCreate(options.token);
	} catch (error) {
		console.error(error);
		// TODO: show error and clear form
	} finally {
		$("#leave").attr("disabled", false);
	}
});


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

/*
 * Called when a user clicks Leave in order to exit a channel.
 */
$("#leave").click(function (e) {
	leave();
});

// Unpublish the local video and audio tracks to the channel when the user down the button #unpublish
$("#unpublish").on("click", async function () {
	if (published === true) {
		await client.unpublish(Object.values(localTracks));
		published = false;
		$("#unpublish").html(`<img src="icons/mic_black_24dp.svg" alt="" class="material-icons">`);
	} else {
		await client.publish(Object.values(localTracks));
		published = true;
		$("#unpublish").html(`<img src="icons/mic_off_black_24dp.svg" alt="" class="material-icons">`);
	}
});

function initScreen() {
	$(".meeting-area").hide();

	if (typeof audioElm != "undefined") {
		audioElm.pause();
		configureDefaultControlPanel(); // bgm buttons default setting
	}
}

function initAgora() {
	published = false;

	client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

	localTracks = {
		videoTrack: null,
		audioTrack: null
	};

	remoteUsers = {};

	options = {
		appid: "adaa9fb7675e4ca19ca80a6762e44dd2",
		channel: null,
		uid: null,
		token: null,
		userName: null,
	};
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
	[options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
		// Join the channel.
		client.join(options.appid, options.channel, options.token || null, options.uid || null),
		// Create tracks to the local microphone and camera.
		AgoraRTC.createMicrophoneAudioTrack(),
		AgoraRTC.createCameraVideoTrack()
	]);

	// Play the local video track to the local browser and update the UI with the user ID.
	localTracks.videoTrack.play("local-player");
	$("#local-player-name").text(`${options.userName} (You)`);

	// Show token and password
	const shortenedToken = truncate(options.token, 10);
	const shortenedChannelName = truncate(options.channel, 10);

	$("#token-and-password").html(`Token: ${shortenedToken}<br>Password: ${shortenedChannelName}`);

	// Publish the local video and audio tracks to the channel.
	await client.publish(Object.values(localTracks));
	published = true;
	console.log("publish success");

	$(".join-area").hide();
	$(".meeting-area").fadeIn();
	$("#join").text("Join");
	$("#create").text("Create");
	$("#create").attr("disabled", false);

	// Firestore Init (including listners)
	initFirestore();
}

function truncate(str, n) {
	return (str.length > n) ? `${str.substr(0, n - 1)} &hellip;` : str;
};

/*
 * Stop all local and remote tracks then leave the channel.
 */
async function leave() {
	for (trackName in localTracks) {
		var track = localTracks[trackName];
		if (track) {
			track.stop();
			track.close();
			localTracks[trackName] = undefined;
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
		$("#leave").html(`<img src="icons/call_end_black_24dp.svg" alt="" class="material-icons">`)
	}, 1000);
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

// Meeting Info card
$("#copy-infos-to-clipboard").click(function (e) {
	e.preventDefault();

	copyTextToClipboard();
});

$("#copy-infos-to-clipboard").mouseout(function () {
	mouseOut();
});

function copyTextToClipboard() {
	const text = generateShareUrl();
	const tooltip = $("#meeting-infos-tooltip")[0];

	navigator.clipboard.writeText(text);

	$(tooltip).html(`Copied: ${truncate(text, 10)}`);
}

function generateShareUrl() {
	return `${appUrl}?token=${options.token}&channel=${options.channel}`;
}

function generateUid() {
	let uid = '0000000000';

	return parseInt((uid + Math.floor(Math.random() * 1000000000)).slice(-10));
}

function mouseOut() {
	const tooltip = $("#meeting-infos-tooltip")[0];

	$(tooltip).html("Copy");
}
