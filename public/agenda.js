const setAgendaButton = $('#set-agenda')[0];

$(setAgendaButton).click(function (e) {
	const agenda = $("#agenda-in").val();

	$("#agenda-out").text(agenda);
	sendAgenda(agenda);
});

// Send agenda to Firestore > sync-agenda-beta collection
function sendAgenda(agenda) {
	const syncAgendaDocId = "m3xucfEwuennPStNWq0M";
	const syncAgendaCollection = "sync-agenda-beta";
	const agendaRef = db.collection(syncAgendaCollection).doc(syncAgendaDocId);

	console.log(`Sending agenda: ${agenda}`);

	agendaRef.set({
		agenda: agenda,
	}).then(() => {
		console.log(`Agenda successfully sent!`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});
}
