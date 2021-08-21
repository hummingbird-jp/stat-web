const setAgendaButton = $('#set-agenda')[0];
const syncAgendaCollection = "sync-agenda-beta";

$(setAgendaButton).click(function (e) {
	const agenda = $("#agenda-in").val();

	$("#agenda-out").text(agenda);
	sendAgenda(agenda);
});

// Send agenda to Firestore > sync-agenda-beta collection
function sendAgenda(agenda) {
	const agendaRef = db.collection(syncAgendaCollection).doc(meetingId);

	agendaRef.set({
		agenda: agenda,
	}).then(() => {
		console.log(`Agenda successfully sent!`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});
}

// Listen to sync-agenda-beta collection; code below will be run
// when something has changed on Firestore > sync-agenda-beta
db.collection(syncAgendaCollection).doc(meetingId).onSnapshot((doc) => {
	const newAgenda = doc.data().agenda;

	$('#agenda-out').text(newAgenda);
});
