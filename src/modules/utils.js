import * as _ from "..";
import * as stat_auth from "./stat_auth";

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
	return `${_.appUrl}?channel=${stat_auth.user.channel}`;
}

export function generateUid() {
	let uid = '0000000000';

	return parseInt((uid + Math.floor(Math.random() * 1000000000)).slice(-10));
}
