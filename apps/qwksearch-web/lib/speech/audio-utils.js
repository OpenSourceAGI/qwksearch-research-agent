//see also: https://github.com/colmeye/js-mediarecorder-to-wav/blob/main/wave-worker.js

// 16000
export async function resampleAudio(audioBuffer, targetSampleRate) {
  const offlineCtx = new OfflineAudioContext(1, targetSampleRate * audioBuffer.duration, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  return await offlineCtx.startRendering();
}
// const floatArray = resampledBuffer.getChannelData(0);

/**
 * Applies gain to an audio buffer to increase or decrease volume
 * @param {AudioBuffer} audioBuffer - The audio buffer to adjust
 * @param {number} gain - Gain factor (e.g., 1.5 for 50% louder)
 * @returns {AudioBuffer} - The adjusted audio buffer
 */
export function applyAudioGain(audioBuffer, gain = 1.5) {
    // Create a copy to avoid modifying the original
    const audioContext = new AudioContext();
    const newBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    // Apply gain to each channel
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channelData = audioBuffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);
        for (let j = 0; j < channelData.length; j++) {
            // Apply gain and clamp to [-1, 1]
            newChannelData[j] = Math.max(-1, Math.min(1, channelData[j] * gain));
        }
    }
    
    return newBuffer;
}

export function convertAudioBufferToWav(audioBuffer) {
    const numOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChannels * 2; // 2 bytes per sample
    const sampleRate = audioBuffer.sampleRate;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1 size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numOfChannels * 2, true); // byte rate
    view.setUint16(32, numOfChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);
    
    let offset = 44;
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channelData = audioBuffer.getChannelData(i);
        for (let j = 0; j < channelData.length; j++) {
            const sample = Math.max(-1, Math.min(1, channelData[j]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
