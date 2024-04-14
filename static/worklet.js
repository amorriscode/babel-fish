class MyAudioWorklet extends AudioWorkletProcessor {
	constructor(options) {
		super(options);
		this.silentFrames = 0;
		this.audioData = [];
		this.isCollectingData = true;
		this.sampleRate = options.processorOptions.sampleRate;
		this.volumeThreshold = 0.005;
		this.silenceThreshold = 10;
		this.stopAudioThreshold = 500;
	}

	process(inputs, outputs, parameters) {
		const input = inputs[0];
		const bufferLength = input[0].length;
		const channel = input[0];
		let isSilence = true;

		for (let i = 0; i < bufferLength; i++) {
			if (Math.abs(channel[i]) >= this.volumeThreshold) {
				isSilence = false;
				break;
			}
		}

		if (!isSilence) {
			this.silentFrames = 0;
			if (this.isCollectingData) {
				this.audioData.push(channel.slice());
			}
		} else {
			this.silentFrames += 1;
		}

		if (this.silentFrames >= this.silenceThreshold && this.isCollectingData) {
			this.sendAudioData();
			this.audioData = [];
			this.isCollectingData = false;
		}

		if (this.silentFrames >= this.stopAudioThreshold && !this.isCollectingData) {
			this.sendAudioData();
			this.port.postMessage({ type: 'stop' });
		}

		// Resume data collection when non-silence is detected
		if (!isSilence && !this.isCollectingData) {
			this.isCollectingData = true;
		}

		return true;
	}

	sendAudioData() {
		if (this.audioData.length === 0) {
			return;
		}

		try {
			// Flatten the stored audio buffers and convert to a single audio data buffer
			const numSamples = this.audioData.reduce((acc, val) => acc + val.length, 0);
			const audioBuffer = new Float32Array(numSamples);
			let offset = 0;
			for (let chunk of this.audioData) {
				audioBuffer.set(chunk, offset);
				offset += chunk.length;
			}

			const bytes = this.getWavBytes(audioBuffer.buffer, {
				isFloat: false,
				numChannels: 1,
				sampleRate: this.sampleRate
			});

			this.port.postMessage({ type: 'bytes', bytes });
		} catch (error) {
			this.port.postMessage({
				type: 'log',
				message: `Error sending audio data: ${error}`
			});
		}
	}

	getWavBytes(buffer, options) {
		const numFrames = buffer.byteLength / (options.isFloat ? 4 : 2);
		const headerBytes = this.getWavHeader(Object.assign({}, options, { numFrames }));
		const pcmBytes = this.floatTo16BitPCM(buffer, options.sampleRate);

		const wavBytes = new Uint8Array(headerBytes.length + pcmBytes.byteLength);
		wavBytes.set(headerBytes, 0);
		wavBytes.set(new Uint8Array(pcmBytes), headerBytes.length);

		return wavBytes.buffer;
	}

	floatTo16BitPCM(input) {
		const inputFloats = new Float32Array(input);
		const buffer = new ArrayBuffer(inputFloats.length * 2);
		const view = new DataView(buffer);

		for (let i = 0, offset = 0; i < inputFloats.length; i++, offset += 2) {
			const s = Math.max(-1, Math.min(1, inputFloats[i]));
			view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
		}

		return buffer;
	}

	getWavHeader(options) {
		const numFrames = options.numFrames;
		const numChannels = options.numChannels || 2;
		const sampleRate = options.sampleRate || 44100;
		const bytesPerSample = options.isFloat ? 4 : 2;
		const format = options.isFloat ? 3 : 1;

		const blockAlign = numChannels * bytesPerSample;
		const byteRate = sampleRate * blockAlign;
		const dataSize = numFrames * blockAlign;

		const buffer = new ArrayBuffer(44);
		const dv = new DataView(buffer);

		let p = 0;

		function writeString(s) {
			for (let i = 0; i < s.length; i++) {
				dv.setUint8(p + i, s.charCodeAt(i));
			}
			p += s.length;
		}

		function writeUint32(d) {
			dv.setUint32(p, d, true);
			p += 4;
		}

		function writeUint16(d) {
			dv.setUint16(p, d, true);
			p += 2;
		}

		writeString('RIFF'); // ChunkID
		writeUint32(dataSize + 36); // ChunkSize
		writeString('WAVE'); // Format
		writeString('fmt '); // Subchunk1ID
		writeUint32(16); // Subchunk1Size
		writeUint16(format); // AudioFormat https://i.stack.imgur.com/BuSmb.png
		writeUint16(numChannels); // NumChannels
		writeUint32(sampleRate); // SampleRate
		writeUint32(byteRate); // ByteRate
		writeUint16(blockAlign); // BlockAlign
		writeUint16(bytesPerSample * 8); // BitsPerSample
		writeString('data'); // Subchunk2ID
		writeUint32(dataSize); // Subchunk2Size

		return new Uint8Array(buffer);
	}
}

registerProcessor('worklet', MyAudioWorklet);
