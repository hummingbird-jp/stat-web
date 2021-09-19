import * as bootstrap from "bootstrap";

import * as auth from "firebase/auth";
import * as stat_firebase from "./modules/stat_firebase";
import * as stat_auth from "./modules/stat_auth";
import * as agenda from "./modules/agenda";
import * as agora from "./modules/agora"
import * as reaction from "./modules/reaction";
import * as timer from "./modules/timer";
import * as utils from "./modules/utils"

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

export const appUrl = $(location).attr('href');
const setAgendaButton = $('#set-agenda')[0];

utils.initScreen();
agora.initAgora();

$("#sign-in-with-google").on("click", async function () {
	//await stat_auth.signin();

	function waitForLoading(targetWindow) {
		return new Promise((resolve, reject) => {
			targetWindow.addEventListener("load", resolve);
		});
	}

	stat_auth.signin().then(async (result) => {

		console.log("debug: ", result);

		const authInstance = auth.getAuth(stat_firebase.firebaseApp);
		auth.onAuthStateChanged(authInstance, async (userAuth) => {
			console.log("result ", userAuth);
			if (userAuth) {
				window.location.href = './meeting/';
				await waitForLoading(window);
			} else {
				console.log("User doesnt have Auth!");
			}
		});

	}).catch((err) => {
		// TODO: show error screen if log in failed
		console.error("Error signing in: ", err);
	})
	$("#sign-in-with-google").hide();


	// Judge if user already has meeting token as URL parameters
	const urlParams = new URL(appUrl).searchParams;

	stat_auth.user.token = urlParams.get("token");
	stat_auth.user.channel = urlParams.get("channel");


	if (stat_auth.user.token && stat_auth.user.channel) {
		stat_auth.user.token = stat_auth.user.token.replaceAll(' ', '+');
		stat_auth.user.uid = utils.generateUid();

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

		await agora.joinOrCreate(stat_auth.user.token);
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

	const authInstance = auth.getAuth(stat_firebase.firebaseApp);
	auth.onAuthStateChanged(authInstance, async (userAuth) => {
		console.log("result ", userAuth);
		if (userAuth) {
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

		} else {
			stat_auth.signin();
		}
	});

});

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

// Unpublish the local video and audio tracks to the channel when the user down the button #unpublish
$("#unpublish").on("click", async function () {
	await agora.unpublish();
});

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
			const text = utils.generateShareUrl();
			const tooltip = $("#meeting-infos-tooltip");

			utils.copyTextToClipboard(text, tooltip);
			break;
		case "m":
			await agora.unpublish();
			break;
		case "l":
			agora.leave();
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
	const text = utils.generateShareUrl();
	const tooltip = $("#meeting-infos-tooltip");
	utils.copyTextToClipboard(text, tooltip);
});

// Revert tooltip text to "Share (S)"
$("#copy-infos-to-clipboard").on("mouseout", function () {
	const tooltip = $("#meeting-infos-tooltip");

	$(tooltip).html("Share (S)");
});

// Leave
$("#leave").on('click', function (e) {
	agora.leave();
});
