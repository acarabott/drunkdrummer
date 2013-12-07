/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = '';

var trackURL = 'audio/riff.mp3';
var trackID = 'TRLBGPN142CE22AC29';


var audioContext = new webkitAudioContext();
var audioData = [];
var request = new XMLHttpRequest();
var processor = audioContext.createScriptProcessor(4096, 1, 1);
var source;
var origBuf;
var trackBuf;
var notes;
var segments;
var minDur = 10;
var FADE_OUT_FRAMES = audioContext.sampleRate * 0.5;
var FADE_IN_FRAMES = audioContext.sampleRate * 0.1;


var canvas, canvasContext, waveform, waveformData;

var doPrint = 0;
var curEvent;

var startTime;
var canTrigger = true;
var loopCount = 1;
var muteCount = 0;

var doMuting = false;

function start() {
	playBuffer();
	canTrigger = true;
}

function update_sections() {
	var i;

	$('.section').remove();

	for (i = 0; i < loopCount - muteCount; i++) {
		$('#container').append($('<div>').addClass('section'));
	}

}
// Multiple of 4 loops...
processor.onaudioprocess = function (event) {
	if (startTime !== undefined) {
		if ((audioContext.currentTime - startTime) % trackBuf.duration < 1) {

			if (canTrigger) {
				console.log("ACTION!");
				if (doMuting) {

					if (muteCount < loopCount) {
						console.log("muting:", loopCount - muteCount - 1);
						muteRepeat(loopCount - muteCount - 1, true, muteCount === 0);

						if (muteCount > 0) {
							muteSection(
								FADE_OUT_FRAMES,
								(loopCount - muteCount) * origBuf.length
							);
						}

						muteCount++;
					}
					update_sections();
				}
				canTrigger = false;
			}
		} else {
			if (!canTrigger) {
				canTrigger = true;
			}
		}
	}
};
processor.connect(audioContext.destination);


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
			update_sections();
		} else {
			trackBuf = buffer;
		}
	});
};
request.send();

function extendBuffer(buffer, duration) {
	var big, bigBuffer, c, i;

	loopCount = Math.ceil(duration / buffer.duration);
	loopCount = loopCount + (loopCount % 2);

	big = new Float32Array(new ArrayBuffer((buffer.length * 4) * loopCount));
	bigBuffer = audioContext.createBuffer(
		buffer.numberOfChannels,
		big.length,
		audioContext.sampleRate
	);

	for (c = 0; c < buffer.numberOfChannels; c++) {
		for (i = 0; i < loopCount; i++) {
			big.set(buffer.getChannelData(c), i * buffer.length);
		}

		bigBuffer.getChannelData(c).set(big);
	}
	console.log("loopcount:", loopCount);

	return bigBuffer;
}

function getFadeMul(index, numFrames, fadeOut) {
	var mul;

	if (fadeOut) {
		mul = (numFrames - index) / numFrames;
	} else {
		mul = index / numFrames;
	}

	// square twice to get a more natural quartic curve
	// ref: Miller Puckette: The Theory and Technique of Electronic Music
	// http://crca.ucsd.edu/~msp/techniques/latest/book-html/node70.html
	mul = mul * mul;
	mul = mul * mul;

	return mul;
}

function muteSection(numFrames, offset, doFadeOut, doFadeIn) {
	var c, i, channel;

	for (c = 0; c < trackBuf.numberOfChannels; c++) {
		channel = trackBuf.getChannelData(c);
		for (i = 0; i < numFrames; i++) {

			if (i < FADE_OUT_FRAMES && doFadeOut) {
				channel[offset + i] *= getFadeMul(i, FADE_OUT_FRAMES, true);
			} else if (i > numFrames - FADE_IN_FRAMES && doFadeIn) {
				channel[offset + i] *= getFadeMul(
					(i - (numFrames - FADE_IN_FRAMES)) - 1,
					FADE_IN_FRAMES,
					false
				);
			} else {
				channel[offset + i] = 0;
			}
		}
	}
}

function muteRepeat(index, doFadeOut, doFadeIn) {
	muteSection(
		origBuf.length,
		origBuf.length * index,
		doFadeOut,
		doFadeIn
	);
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
	createSource(true);
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
	createSource(true);
	source.start(startTime = audioContext.currentTime);
}




// TODO

// Cut out segments etc
// Test analysis
// Show Waveform
// Wonky beats
// Do Immigrant song