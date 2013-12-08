/*jslint plusplus: true, passfail: true, browser: true, devel: true, indent: 4, maxlen: 100 */
/*global webkitAudioContext: false, createJRemixer: false, jQuery: false, $: false,
		Waveform: false, Float32Array: false*/

var apiKey = '';

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
var loopCount = 2;
var muteCount = 0;

var doMuting = false;
var canStartDrinking = false;
var segmentMuteCounts = [];
var canMuteSegments = false;

function startDrinking() {
	canStartDrinking = true;
}

function prStartDrinking() {
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
				.css('width', (90 / loopCount) + "%")

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



			muteCount++;
		} else {
			canMuteSegments = true;
		}
		if (muteCount > 0) {
			muteSection(
				FADE_OUT_FRAMES,
				(loopCount - muteCount) * origBuf.length
			);
		}
		updateDrinks();
	}
}

function tryMuteSegments() {
	if (canMuteSegments) {
		muteLastSegmentofLastSection();
	}
}

processor.onaudioprocess = function (event) {
	if (startTime !== undefined) {
		// beginning of big loop
		if (((audioContext.currentTime - startTime) % trackBuf.duration) < 1) {
			if (canTrigger) {
				tryMuting();
				tryMuteSegments();

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
				// console.log('loop loop');
				if (canStartDrinking) {
					prStartDrinking();
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

function setLoopCount(count) {
	var i;

	loopCount = count;

	segmentMuteCounts = [];

	for (i = 0; i < loopCount; i++) {
		segmentMuteCounts[i] = 0;
	}

}

function extendBuffer(buffer, count) {
	var big, bigBuffer, c, i;

	// loopCount = count;
	// loopCount = Math.ceil(duration / buffer.duration);
	// loopCount = loopCount + (loopCount % 2);
	setLoopCount(loopCount);

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
	var c, i, channel, inFrames, outFrames;

	numFrames = Math.ceil(numFrames);
	offset = Math.ceil(offset);

	outFrames = Math.ceil(Math.min(numFrames * 0.1, FADE_OUT_FRAMES));
	inFrames = Math.ceil(Math.min(numFrames * 0.05, FADE_IN_FRAMES));

	for (c = 0; c < trackBuf.numberOfChannels; c++) {
		channel = trackBuf.getChannelData(c);

		for (i = 0; i < numFrames; i++) {
			if (i < inFrames) {
				if (doFadeOut) {
					// console.log('fading out', i);
					channel[offset + i] *= getFadeMul(i, outFrames, true);
				} else {
					// console.log('fading out mute', i);
					channel[offset + i] = 0;
				}
			} else if (i > numFrames - inFrames) {
				if (doFadeIn) {
					// console.log('fading in', i);
					channel[offset + i] *= getFadeMul(
						(i - (numFrames - inFrames)) - 1,
						inFrames,
						false
					);
				} else {
					// console.log('fading in mute', i);
					channel[offset + i] = 0;
				}
			} else {
				// console.log("straight mute", i);
				channel[offset + i] = 0;
			}
		}
		// trackBuf.getChannelData(c).set(channel);

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

function muteSegment(loopIndex, segmentIndex, doFadeOut, doFadeIn) {
	var segment = track.analysis.segments[segmentIndex],
		numFrames = Math.ceil(segment.duration * audioContext.sampleRate),
		offset = (loopIndex * origBuf.duration) + segment.start;

	offset = Math.ceil(offset * audioContext.sampleRate);

	console.log('muting segment', segmentIndex);

	muteSection(
		numFrames,
		offset,
		doFadeOut,
		doFadeIn
	);
}

function muteLastSegmentOfSection(sectionIndex) {
	var segmentIndex = (segments.length - 1) - segmentMuteCounts[sectionIndex];

	if (!(sectionIndex === 0 && segmentIndex === 0)) {
		muteSegment(
			sectionIndex,
			segmentIndex,
			true,
			false
		);

		if (segmentMuteCounts[sectionIndex] > 0) {
			muteSection(
				FADE_OUT_FRAMES,
				Math.ceil((sectionIndex * origBuf.length) +
					segments[segmentIndex].start * audioContext.sampleRate)
			);
		}

		segmentMuteCounts[sectionIndex]++;

		if (segmentMuteCounts[sectionIndex] === segments.length) {
			muteCount++;
		}
	} {
		canMuteSegments = false;
	}
}

function muteLastSegmentofLastSection() {
	var sectionIndex = (loopCount - muteCount) - 1;

	if (sectionIndex > -1) {
		console.log("muting last segment of", sectionIndex);
		muteLastSegmentOfSection(sectionIndex);
	} else {
		console.log("no more segments to mute");
	}
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
	playSegmentAt(Math.floor(Math.random() * track.analysis.segments.length));
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
// group segments if short
// Wonky beats