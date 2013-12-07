/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = '';

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

var curp = 0,
	curt = 0;

function getPitch(segment, pThresh, cThresh) {
	var pitches = segment.pitches,
		max = Math.max.apply(Math, pitches),
		maxInd = pitches.indexOf(max);

	if (max > pThresh && segment.confidence > cThresh) {
		return maxInd;
	}

	return -1;
}

function sortSegments(pThresh, cThresh) {
	var i, seg, pitches, max, maxInd;

	notes = [];
	for (i = 0; i < segments.length; i++) {
		seg = segments[i];

		maxInd = getPitch(seg, pThresh, cThresh);

		if (maxInd !== -1) {
			if (notes[maxInd] === undefined) {
				notes[maxInd] = [];
			}

			notes[maxInd].push(seg);
		}

	}

	curp = pThresh;
	curt = cThresh;
	console.log(curp, curt);
	console.log(notes);
}

function extendNotes() {
	var i, j, k, orig, cur, next;
	var gogo = true;

	for (i = 0; i < notes.length; i++) {
		for (j = 0; j < notes[i].length; j++) {
			orig = notes[i][j];
			cur = orig;
			gogo = true;
			for (k = 0; k < 3; k++) {
				if (gogo) {
					next = cur.next;
					if (next !== null) {
						if (i === 0 && j === 0) {
							console.log("next", next);
							console.log(getPitch(next), i);
						}
						console.log('got here');
						if (getPitch(next) === i) {
							console.log("extending: ", i, j);
							cur.duration += next.duration;
							cur = next;
						} {
							gogo = false;
						}
					}
				}
			}
		}
	}
}

var play = -1;
var wait = 125;
var playRout;
function constant() {
	var segment;
	clearTimeout(playRout);
	playRout = setTimeout(function () {
		if (play > -1 && notes[play] !== undefined) {
			segment = notes[play][Math.floor(Math.random() * notes[play].length)];

			playSegment(segment);
		}
		constant();
	}, wait);
}