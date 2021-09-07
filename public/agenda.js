const setAgendaButton = $('#set-agenda')[0];

$(setAgendaButton).click(function (e) {
	const agenda = $("#agenda-in").val();

	$("#agenda-out").text(agenda);
	sendAgenda(agenda);
});

// Send agenda to Firestore
function sendAgenda (agenda) {

	dbRootRef.collection(agendasCollection).add({
		agenda: agenda,
		timeSet: firebase.firestore.Timestamp.now(),
		setBy: options.userName
	}).then(() => {
		console.log(`Agenda successfully sent!`);
	}).catch((err) => {
		console.error(`Error sending agenda: ${err}`);
	});
}

// Listen to sync-agenda-beta collection; code below will be run
// when something has changed on Firestore > "agendas"
function listenAgenda () {

	dbRootRef.collection(agendasCollection).onSnapshot((snapshot) => {
		snapshot.docChanges().forEach((change) => {
			if (change.type === "added") {
				const newAgenda = change.doc.data().agenda;
				$('#agenda-out').text(newAgenda);
			}
			// Memo: other usecases
			//if (change.type === "modified") {}
			//if (change.type === "removed") {}

		});
	});
}
