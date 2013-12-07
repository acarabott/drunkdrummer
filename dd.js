/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = 'YLTCU72SODVIC00NB';

var trackURL = 'audio/wife.mp3';
var trackID = 'TRYKSFC142CDDF887A';
// var trackURL = 'audio/mind.mp3';
// var trackID = 'TRSNVGC142CDD7DA01';
// var trackURL = 'audio/gould.mp3';
// var trackID = 'TRRNKKL142CD3A9880';

var audioContext = new webkitAudioContext();
var audioData = [];
var request = new XMLHttpRequest();
var source;
var trackBuf;
var notes;
var segments;

request.open('GET', trackURL, true);
request.responseType = 'arraybuffer';
request.onload = function () {
	audioContext.decodeAudioData(request.response, function (buffer) {
		var i;

		for (i = 0; i < buffer.numberOfChannels; i++) {
			audioData[i] = new Float32Array(buffer.getChannelData(i));
		}

		trackBuf = buffer;
	});
};
request.send();


var remixer = createJRemixer(audioContext, $, apiKey);
var track;

remixer.remixTrackById(trackID, trackURL, function (t, percent) {
	track = t;
	if (track.status === 'ok') {
		console.log('fuck you');
		segments = track.analysis.segments;
		sortSegments(0, 0);
	}
});

var tatedur = 0.5;

function playSegment(segment) {
	console.log(segment);
	source = audioContext.createBufferSource();
	source.buffer = trackBuf;
	source.loop = false;
	source.connect(audioContext.destination);

	source.start(0, segment.start, segment.duration);
	// source.start(0, segment.start, Math.min(segment.duration * tatedur, wait/1000));
}

function playSegmentAt(index) {
	playSegment(segments[index]);
}

function playRandomSegment() {
	playTatuMAt(Math.floor(Math.random() * track.analysis.segments.length));
}
