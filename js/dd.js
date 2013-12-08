/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = 'YLTCU72SODVIC00NB';

var trackURL = 'audio/riff.wav';
var trackID = 'TRJEEOV142D1702A6F';


var audioContext = new webkitAudioContext();
var audioData = [];
var request = new XMLHttpRequest();
var processor = audioContext.createScriptProcessor(256, 1, 1);
var source;
var origBuf;
var trackBuf;
var notes;
var segments;
var minDur = 20;
var FADE_OUT_FRAMES = audioContext.sampleRate * 0.5;
var FADE_IN_FRAMES = audioContext.sampleRate * 0.1;


var canvas, canvasContext, waveform, waveformData;

var doPrint = 0;
var curEvent;

var startTime;
var canTrigger = true;
var origCanTrigger = true;
var loopCount = 6;
var muteCount = 0;

var doMuting = false;
var canStartDrinking = false;

function startDrinking() {
	doMuting = true;
	canStartDrinking = false;
	start();
}

function start() {
	playBuffer();
}

function createDrinks() {
	var i;
	for (i = 0; i < loopCount; i++) {
		$('#drinks').append(
			$('<div>')
				.addClass('drink full')
				.css('width', (100 / loopCount) + "%")

		);
	}
}
function updateDrinks() {
	var i;

	$('.drink').each(function(index, el) {
		if ( index >= loopCount - muteCount) {
			$(el).removeClass('full');
			$(el).addClass('empty');
		}
	});
}

function tryMuting() {
	if (doMuting) {
		if (muteCount < loopCount - 1) {
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
		updateDrinks();
	}
}

processor.onaudioprocess = function (event) {
	if (startTime !== undefined) {
		// beginning of big loop
		if (((audioContext.currentTime - startTime) % trackBuf.duration) < 1) {
			if (canTrigger) {
				tryMuting();

				canTrigger = false;
			}
		} else {
			if (!canTrigger) {
				canTrigger = true;
			}
		}

		// each loop trigger
		if (((audioContext.currentTime - startTime) % origBuf.duration) < 1) {
			if (origCanTrigger) {
				if (canStartDrinking) {
					startDrinking();
				}
				origCanTrigger = false;
			}
		} else {
			if (!origCanTrigger) {
				origCanTrigger = true;
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

		// if (buffer.duration < minDur) {
			trackBuf = extendBuffer(buffer, loopCount);
			createDrinks();
			updateDrinks();
		// } else {
			// trackBuf = buffer;
		// }
	});
};
request.send();

function extendBuffer(buffer, count) {
	var big, bigBuffer, c, i;

	// loopCount = count;
	// loopCount = Math.ceil(duration / buffer.duration);
	// loopCount = loopCount + (loopCount % 2);

	big = new Float32Array(new ArrayBuffer((buffer.length * 4) * count));
	bigBuffer = audioContext.createBuffer(
		buffer.numberOfChannels,
		big.length,
		audioContext.sampleRate
	);

	for (c = 0; c < buffer.numberOfChannels; c++) {
		for (i = 0; i < count; i++) {
			big.set(buffer.getChannelData(c), i * buffer.length);
		}

		bigBuffer.getChannelData(c).set(big);
	}
	console.log("loopcount:", count);

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

function stop() {
	if (source !== undefined) {
		if (source.playbackState !== 0) {
			source.stop(0);
		}
	}
}
function playBuffer() {
	stop();
	createSource(true);
	source.start(startTime = audioContext.currentTime);
}




// TODO

// Do Immigrant song
// Cut out segments etc
// Wonky beats