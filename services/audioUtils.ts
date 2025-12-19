/**
 * Wraps raw PCM data in a WAV file header so browsers can play it as a Blob.
 * Gemini TTS returns raw PCM (linear 16-bit, little-endian) at 24kHz.
 */
export const pcmToWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const pcmView = new Uint8Array(buffer, 44);
  pcmView.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const hexToUint8Array = (hexString: string): Uint8Array => {
  if (!hexString) return new Uint8Array(0);
  const match = hexString.match(/.{1,2}/g);
  if (!match) return new Uint8Array(0);
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/mp3;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Concatenates multiple AudioBuffers into a single WAV Blob.
 */
export const concatenateAudioBuffers = async (buffers: ArrayBuffer[]): Promise<Blob> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // 1. Decode all buffers
  const audioBuffers: AudioBuffer[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    try {
      if (!buf || buf.byteLength === 0) {
          console.warn(`Buffer ${i} is empty or invalid.`);
          continue;
      }
      const decoded = await audioContext.decodeAudioData(buf.slice(0)); // slice(0) to clone, as decode detaches
      audioBuffers.push(decoded);
    } catch (e) {
      console.warn(`Failed to decode audio segment ${i}, skipping.`, e);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error(`No valid audio generated. Input buffers: ${buffers.length}.`);
  }

  // 2. Calculate total length
  const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
  
  // 3. Create output buffer (assuming mono for simplicity, or taking channel count from first)
  const outputBuffer = audioContext.createBuffer(
    1, // Force Mono for consistency
    totalLength,
    audioBuffers[0].sampleRate
  );

  // 4. Copy data
  let offset = 0;
  const outputData = outputBuffer.getChannelData(0);
  
  for (const buf of audioBuffers) {
    // If the buffer is stereo, mix it down or take first channel
    const inputData = buf.getChannelData(0); 
    outputData.set(inputData, offset);
    offset += buf.length;
  }

  // 5. Convert AudioBuffer to WAV
  // We reuse pcmToWavBlob but we need 16-bit PCM from Float32
  const pcmData = new Int16Array(totalLength);
  for (let i = 0; i < totalLength; i++) {
    // Float (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const s = Math.max(-1, Math.min(1, outputData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return pcmToWavBlob(new Uint8Array(pcmData.buffer), outputBuffer.sampleRate);
};

/**
 * Processes a user uploaded file:
 * 1. Decodes audio
 * 2. Downsamples to 16kHz
 * 3. Trims to max 10 seconds (optimal for zero-shot cloning)
 * 4. Converts to Mono
 * 5. Returns Base64 string of WAV
 */
export const processReferenceAudio = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  // Create offline context to handle decoding and resampling
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Decode original
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Target settings
  const TARGET_RATE = 16000;
  const MAX_DURATION = 10; // seconds
  
  // Create offline context for resampling
  const offlineCtx = new OfflineAudioContext(1, Math.min(audioBuffer.duration, MAX_DURATION) * TARGET_RATE, TARGET_RATE);
  
  // Create source
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  // Render resampled buffer
  const resampledBuffer = await offlineCtx.startRendering();
  
  // Extract data
  const length = resampledBuffer.length;
  const inputData = resampledBuffer.getChannelData(0);
  
  // Convert Float32 to Int16 PCM
  const pcmData = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, inputData[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Create WAV Blob
  const wavBlob = pcmToWavBlob(new Uint8Array(pcmData.buffer), TARGET_RATE);
  
  // Convert to Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(wavBlob);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};