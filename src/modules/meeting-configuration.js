import * as firestore from "@firebase/firestore";
import * as firebase from "./stat_firebase";

export async function initMeetingTimeLimit() {

	// Add caption to the bar
	const caption = $(`
			<p class="limit-text">
				<span id="limit-span">00h40m</span> remains.
				<a href="">Need more time?</a>
			</p>
		`);
	$("#limit-all").append(caption);

	const id = setInterval(update, 60000);

	async function update() {
		const snapshot = await firestore.getDoc(firebase.dbRootRef);

		// Firestore Timestamp to numeric timestamp
		const startTime = snapshot.data().meetingStartedAt.toMillis();
		const endTime = snapshot.data().meetingLimitUntil.toMillis();
		const currentTime = firestore.Timestamp.now().toMillis();
		const percentage = Math.round((currentTime - startTime) / (endTime - startTime) * 100);

		$("#limit-progress").css("width", percentage + '%');

		if (percentage >= 100) {
			clearInterval(id);

			$(".limit-text").fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
			const timerSound = new Audio("sounds/alarm.wav");
			timerSound.play();

		} else {
			const remainMillis = endTime - currentTime;
			const minutes = Math.floor((remainMillis / 1000 / 60) % 60);
			const hours = Math.floor((remainMillis / (1000 * 60 * 60)) % 24);

			const remains = ('0' + hours).slice(-2) + 'h' + ('0' + minutes).slice(-2) + 'm';
			$("#limit-span").text(remains);
		}
	}
}
