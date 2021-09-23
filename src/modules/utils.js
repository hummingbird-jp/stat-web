import * as bootstrap from "bootstrap";

import * as _ from "..";

export function showToast(elementId) {
	const toastOptions = { animation: true, autohide: true, delay: 3000 };
	const toastElement = new bootstrap.Toast($(`#${elementId}`), toastOptions);

	toastElement.show();
}

export function initScreen() {
	$('#join-form').css('display', 'none');
	$('#create-form').css('display', 'none');

	$(".meeting-area").hide();
	$(".control-button-group").hide();
}

// Copy share url to clipboard
export function copyTextToClipboard(text, tooltip) {
	navigator.clipboard.writeText(text);

	$(tooltip).html(`Copied!`);
}

export function truncate(str, n) {
	return (str.length > n) ? `${str.substr(0, n - 1)} &hellip;` : str;
};

export function generateShareUrl() {
	return window.location.href;
}

export function statConsoleLog(msg) {
	console.log(`%cStat! [DEBUG]: %c${msg}`, 'color: #8f35ff', 'color: #0D0D0D');
}
