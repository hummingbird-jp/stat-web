import * as firestore from "@firebase/firestore";
import * as stat_auth from "./stat_auth";
import * as stat_firebase from "./stat_firebase";
import * as _ from "..";
import * as agora from "./agora"

export async function initMeetingTimeLimit() {

	// Add caption to the bar
	const caption = $(`
			<p class="limit-text">
				<span id="limit-span">00h40m</span> remains.
				<a href="https://forms.gle/5prf8vyS73KygvdL9" target="_blank" style="cursor: pointer;">Extend limit</a>
			</p>
		`);
	$("#limit-all").append(caption);

	const id = setInterval(update, 60000);

	async function update() {
		const snapshot = await firestore.getDoc(stat_firebase.dbRootRef);

		// Firestore Timestamp to numeric timestamp
		const startTime = snapshot.data().meetingStartedAt.toMillis();
		const endTime = snapshot.data().meetingLimitUntil.toMillis();
		const currentTime = firestore.Timestamp.now().toMillis();
		const percentage = Math.round((currentTime - startTime) / (endTime - startTime) * 100);

		$("#limit-progress").css("width", percentage + '%');

		if (percentage >= 100) {
			clearInterval(id);

			const alarm = new Audio("../sounds/alarm.wav");
			alarm.play();

			// Force leave meeting
			agora.leave();
			// TODO: show toast message says "Go Premium or send us feedback!"
		} else if (percentage > 80) {
			$(".limit-text").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
		} else {
			const remainMillis = endTime - currentTime;
			const minutes = Math.floor((remainMillis / 1000 / 60) % 60);
			const hours = Math.floor((remainMillis / (1000 * 60 * 60)) % 24);

			const remains = ('0' + hours).slice(-2) + 'h' + ('0' + minutes).slice(-2) + 'm';
			$("#limit-span").text(remains);
		}
	}

	// Create event listener for update limit
	// TODO: Currently anyone can extend meeting limit by clicking the link
	// TODO: So, lets make this for premium account!
	$(".limit-text a").on('click', async function () {
		$(".limit-text a").remove();

		const collectionRef = firestore.collection(stat_firebase.dbRootRef, stat_firebase.extendLimitCollection);
		await firestore.addDoc(collectionRef, {
			timestamp: firestore.Timestamp.now(),
			displayNameStat: stat_auth.user.displayNameStat,
			uid: stat_auth.user.uid
		});

		// Create event listner for show extended result instantly
		const collectionRefExtend = firestore.collection(stat_firebase.dbRootRef, stat_firebase.extendLimitCollection);
		const unsub = firestore.onSnapshot(collectionRefExtend, (doc) => {
			update();
		});

	});

}
