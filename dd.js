/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = '';

var trackURL = 'audio/riff.mp3';
var trackID = 'TRLBGPN142CE22AC29';

var audioContext = new webkitAudioContext();
var audioData = [];
var request = new XMLHttpRequest();
var source;
var origBuf;
var trackBuf;
var notes;
var segments;
var minDur = 30;

request.open('GET', trackURL, true);
request.responseType = 'arraybuffer';
request.onload = function () {
	audioContext.decodeAudioData(request.response, function (buffer) {
		var i;

		for (i = 0; i < buffer.numberOfChannels; i++) {
			audioData[i] = new Float32Array(buffer.getChannelData(i));
		}

		origBuf = buffer;

		if (buffer.duration < minDur) {
			trackBuf = extendBuffer(buffer, minDur);
		} else {
			trackBuf = buffer;
		}
	});
};
request.send();

function extendBuffer(buffer, duration) {
	var count = Math.ceil(duration / buffer.duration),
		// big = new Float32Array(buffer.length),
		big = new Float32Array(new ArrayBuffer((buffer.length * 4) * count)),
		bigBuffer = audioContext.createBuffer(
			buffer.numberOfChannels,
			big.length,
			audioContext.sampleRate
		),
		c, i;

	for (c = 0; c < buffer.numberOfChannels; c++) {
		for (i = 0; i < count; i++) {
			big.set(buffer.getChannelData(c), i * buffer.length);
		}

		bigBuffer.getChannelData(c).set(big);
	}

	return bigBuffer;
}

function muteSection(numFrames, offset) {
	var c, i, channel;

	// TODO fades
	for (c = 0; c < trackBuf.numberOfChannels; c++) {
		channel = trackBuf.getChannelData(c);
		for (i = 0; i < numFrames; i++) {
			channel[offset + i] = 0;
		}
	}
}

function muteRepeat(index) {
	muteSection(origBuf.length, origBuf.length * index);
}

var remixer = createJRemixer(audioContext, $, apiKey);
var track;

remixer.remixTrackById(trackID, trackURL, function (t, percent) {
	track = t;
	if (track.status === 'ok') {
		console.log('fuck you');
		segments = track.analysis.segments;
	}
});

function createSource(loop) {
	source = audioContext.createBufferSource();
	source.buffer = trackBuf;
	source.loop = loop;
	source.connect(audioContext.destination);
}

function playSegment(segment) {
	createSource(false);
	source.start(0, segment.start, segment.duration);
	// source.start(0, segment.start, Math.min(segment.duration * tatedur, wait/1000));
}

function playSegmentAt(index) {
	playSegment(segments[index]);
}

function playRandomSegment() {
	playTatuMAt(Math.floor(Math.random() * track.analysis.segments.length));
}

function playBuffer() {
	createSource(false);
	source.start(0);
}


// TODO

// Show Waveform
// Test analysis
// Cut out sections, till down to segments, /segment etc
// Wonky beats
// Do Immigrant song