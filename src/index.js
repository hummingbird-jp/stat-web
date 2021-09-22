// Bootstrap
import * as bootstrap from "bootstrap";

// Firebase
import * as auth from "firebase/auth";
import * as functions from "firebase/functions";
import * as firestore from "@firebase/firestore";

// Internal Modules
import * as stat_auth from "./modules/stat_auth";
import * as stat_firebase from "./modules/stat_firebase";
import * as agenda from "./modules/agenda";
import * as agora from "./modules/agora"
import * as reaction from "./modules/reaction";
import * as timer from "./modules/timer";
import * as utils from "./modules/utils"

// Stylesheets
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

export const appUrl = $(location).attr('href');
const urlStr = window.location.toString();
const setAgendaButton = $('#set-agenda')[0];

utils.initScreen();
agora.initAgora();

try {
	stat_firebase.enableAppCheck();
	console.log(`AppCheck enabled!`);
} catch (error) {
	console.error(`Error enabling AppCheck: ${error}`);
}

if (window.location.pathname === '/signin/') {
	$("#sign-in-with-google").on("click", async function () {
		// Get URL parameter and pass it to top page
		const urlParamStartsAt = window.location.href.indexOf('?');
		let tempUrlParam = '';
		if (urlParamStartsAt > 0) {
			tempUrlParam = window.location.href.slice(urlParamStartsAt);
		}

		await stat_auth.signin();
		auth.onAuthStateChanged(stat_auth.authInstance, async (user) => {
			if (user) {
				// If successfully signed in, redirect to main page
				console.log(`User signed in. Redirecting to home page...`);
				window.location.href = '../' + tempUrlParam;
			} else {
				console.error(`Error signing in. Try again...`);
			}
		});
	});
} else if (window.location.pathname === '/') {
	// If you are at the main page, check auth instance
	auth.onAuthStateChanged(stat_auth.authInstance, async (user) => {
		if (!user) {
			// 1. User is not signed in.
			// 2. Get URL parameter and pass it to sign in page.
			// 3. Then, Redirect to sign in page.
			console.log(`User not signed in. Redirecting to sign-in page...`);

			const urlParamStartsAt = window.location.href.indexOf('?');
			let tempUrlParam = '';
			if (urlParamStartsAt > 0) {
				tempUrlParam = window.location.href.slice(urlParamStartsAt);
			}
			window.location.href = 'signin/' + tempUrlParam;
		} else {
			// User is signed in.
			// show the form
			console.log(`User already signed in. Showing the form.`);
			$("#sign-in-with-google").hide();

			stat_auth.user.displayNameAuth = user.displayName;
			stat_auth.user.email = user.email;
			stat_auth.user.uid = user.uid;
			stat_auth.user.photoURL = user.photoURL;

			console.log(`Signed in: ${stat_auth.user.displayNameAuth}`);

			$("#display-name").text(`Welcome back, ${stat_auth.user.displayNameAuth} 👋`);

			const toastOptions = { animation: true, autohide: true, delay: 3000 };
			const welcomeMessageElement = new bootstrap.Toast($('#welcome-message'), toastOptions);

			welcomeMessageElement.show();

			const urlParams = new URL(appUrl).searchParams;
			stat_auth.user.channel = urlParams.get("channel");

			if (stat_auth.user.channel) {
				// Join channel
				await agora.joinWithChannelName(stat_auth.user.channel);
			} else {
				$("#sign-in-with-google").hide();
			}
		}
	});
}

$("#btn-create-random-channel").on('click', async function () {
	// 1. Create new document in Firebase channels collection (addDoc)
	// 2. Get document id
	// 3. Use the doc id as channelName
	const db = firestore.getFirestore();
	const collectionRef = firestore.collection(db, 'channels');
	const docRef = await firestore.addDoc(collectionRef, {
		channelCreatedBy: {
			uid: stat_auth.user.uid,
			userName: stat_auth.user.displayNameAuth
		},
		channelCreatedAt: firestore.Timestamp.now(),
		channelTitle: stat_auth.user.displayNameAuth + "'s Meeting",
		latestMeetingId: null,
	});
	const channelName = docRef.id;
	const link = window.location.href + '?channel=' + channelName;

	$("#modal-create-random-channel .modal-body").text(link);
	$("#btn-copy-channel-link").attr("disabled", false);
	$("#btn-start-meeting").attr("disabled", false);

	$("#btn-copy-channel-link").on("click", function () {
		navigator.clipboard.writeText(link);
		$("#btn-copy-channel-link").text("Copied!");
	});

	$("#btn-start-meeting").on('click', async function () {
		window.location.href = link;
	})
})

$("#btn-join-channel").on('click', async function () {
	const inputValue = $("#form-join-channel").val().toString();

	function isValidHttpUrl(string) {
		let url;
		try {
			url = new URL(string);
		} catch (_) {
			return false;
		}
		return url.protocol === "http:" || url.protocol === "https:";
	}

	if (isValidHttpUrl(inputValue)) {
		// Check if the input value is a valid URL
		window.location.href = inputValue;

	} else {
		if (inputValue.length > 0) {
			// Input Value may be equal to channel name
			// Search Firestore if the channel exists
			// If not, ask user to create the channel
			// TODO: This implementation contains a future security issue! Be carefull!
			const db = firestore.getFirestore();
			const docRef = firestore.doc(db, 'channels', inputValue);
			const docSnap = await firestore.getDoc(docRef);
			if (!docSnap.exists()) {
				$("#modal-join-channel .modal-footer").prepend(
					$(`
						<div class="msg-error">
							<h5 class="msg-error">Woops! Join failed.</h5>
							<p>Tips: Check if the channel exists or you have a permission to join the channel.</p>
						</div>
					`)
				)
				setTimeout(() => {
					$("#modal-join-channel .msg-error").fadeOut(500);
				}, 2000);
			} else {
				// Channel exists. Join the channel.
				$("#btn-join-channel").attr("disabled", true);
				$(".modal-backdrop").remove();

				const link = window.location.href + '?channel=' + inputValue;
				window.location.href = link;
			}
		}

	}
});

$("#form-create-named-channel").on('input', async function () {
	$("#modal-create-named-channel .msg-success p").remove();
	$("#modal-create-named-channel .msg-error p").remove();
	const inputValue = $("#form-create-named-channel").val().toString();

	// Check if the input value is allowed to be a channel name
	// in order to satisfy both Agora and Firestore requirements.
	function charChecker(value) {
		const charsProhibited = ["!", "#", "$", "%", "&", "(", ")", "+", ":", ";", "<", "=", ".", ">", "?", "@", "[", "]", "^", "{", "}", "|", "~", ",", " "];
		for (let i = 0; i < charsProhibited.length; i++) {
			if (value.includes(charsProhibited[i])) {
				return false
			}
		}
		return true;
	}

	if (inputValue.length === 0) {
		$("#modal-create-named-channel .input-check-status").html(
			`<img src="icons/search_black_24dp.svg" alt="..." class="material-icons mx-auto">`
		)
	} else {
		// Input length too long. Choose a shorter name
		if (inputValue.length > 32) {
			$("#modal-create-named-channel .modal-body .msg-error").prepend(
				$(`
					<p>Channel name too long.</p>
				`)
			)
		}
		// Input contains prohibited character(s)
		if (!charChecker(inputValue)) {
			$("#modal-create-named-channel .modal-body .msg-error").prepend(
				$(`
					<p>Channel name contains unsupported character(s)!</p>
				`)
			)
		}
		if ((inputValue.length <= 32) && charChecker(inputValue)) {
			// Check if the name is not taken yet
			const db = firestore.getFirestore();
			const docRef = firestore.doc(db, 'channels', inputValue);
			const docSnap = await firestore.getDoc(docRef);
			if (docSnap.exists()) {
				$("#modal-create-named-channel .input-check-status").html(
					`<img src="icons/error_black_24dp.svg" alt="OK" class="material-icons mx-auto">`
				)
				$("#modal-create-named-channel .modal-body .msg-error").append(
					$(`
						<p>Sorry! This name is already taken.<p>
					`)
				)
			} else {
				$("#modal-create-named-channel .input-check-status").html(
					`<img src="icons/check_circle_black_24dp.svg" alt="OK" class="material-icons mx-auto">`
				)
				$("#btn-create-named-channel").attr("disabled", false);

			}
		} else {
			$("#btn-create-named-channel").attr("disabled", true);
			$("#modal-create-named-channel .input-check-status").html(
				`<img src="icons/error_black_24dp.svg" alt="OK" class="material-icons state-error">`
			)
		}
	}
});

$("#btn-create-named-channel").on('click', async function () {
	$("#btn-create-named-channel").attr("disabled", true);
	// Create channel and start meeting
	const inputValue = $("#form-create-named-channel").val().toString();
	const db = firestore.getFirestore();
	const docRef = firestore.doc(db, 'channels', inputValue);
	await firestore.setDoc(docRef, {
		channelCreatedBy: {
			uid: stat_auth.user.uid,
			userName: stat_auth.user.displayNameAuth
		},
		channelCreatedAt: firestore.Timestamp.now(),
		channelTitle: stat_auth.user.displayNameAuth + "'s Meeting",
		latestMeetingId: null,
	});
	const link = window.location.href + '?channel=' + inputValue;
	window.location.href = link;
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

// Control with keypress
$(window).on("keypress", async function (e) {
	// ignore if "#agenda-in" is focused
	const isTyping = $("input").is(":focus");

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
