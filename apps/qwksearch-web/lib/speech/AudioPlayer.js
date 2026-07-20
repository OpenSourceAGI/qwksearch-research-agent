/**
 * Audio player for playing generated TTS audio
 * Handles queuing and playback of audio buffers
 */

export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.queue = [];
    this.isPlaying = false;
    this.initAudioContext();
  }

  /**
   * Initialize the Web Audio API context
   */
  initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Queue audio data for playback
   * @param {ArrayBuffer | RawAudio} audio - The audio data to play
   */
  queueAudio(audio) {
    this.queue.push(audio);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /**
   * Play the next audio in the queue
   */
  async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audio = this.queue.shift();

    try {
      await this.playAudio(audio);
    } catch (error) {
      console.error('Error playing audio:', error);
    }

    this.playNext();
  }

  /**
   * Play audio using Web Audio API
   * @param {ArrayBuffer | RawAudio} audio - The audio to play
   * @returns {Promise<void>}
   */
  playAudio(audio) {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not initialized'));
        return;
      }

      try {
        let audioBuffer;

        // Handle RawAudio objects
        if (audio instanceof RawAudio) {
          audioBuffer = audio.data;
        } else if (audio instanceof ArrayBuffer) {
          audioBuffer = audio;
        } else {
          reject(new Error('Unsupported audio format'));
          return;
        }

        // Decode audio data
        this.audioContext.decodeAudioData(
          audioBuffer,
          (decodedBuffer) => {
            const source = this.audioContext.createBufferSource();
            source.buffer = decodedBuffer;
            source.connect(this.audioContext.destination);

            source.onended = () => {
              resolve();
            };

            source.start(0);
          },
          (error) => {
            reject(error);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop playback and clear the queue
   */
  stop() {
    this.queue = [];
    this.isPlaying = false;
  }
}

/**
 * RawAudio class for representing raw audio data
 */
export class RawAudio {
  constructor(data, sampleRate = 24000) {
    this.data = data;
    this.sampleRate = sampleRate;
  }

  /**
   * Convert to WAV format
   * @returns {ArrayBuffer} WAV file data
   */
  toWav() {
    const channels = 1;
    const sampleRate = this.sampleRate;
    const pcmData = this.data;

    // WAV header
    const wavHeader = this.createWavHeader(
      channels,
      sampleRate,
      pcmData.length
    );

    // Combine header and audio data
    const result = new Uint8Array(wavHeader.length + pcmData.length);
    result.set(wavHeader);
    result.set(new Uint8Array(pcmData.buffer), wavHeader.length);

    return result.buffer;
  }

  /**
   * Create WAV file header
   */
  createWavHeader(channels, sampleRate, audioLength) {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x46464952, true); // "RIFF"
    view.setUint32(4, 36 + audioLength * 2, true); // file length - 8
    view.setUint32(8, 0x45564157, true); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x20746d66, true); // "fmt "
    view.setUint32(16, 16, true); // chunkSize (16 for PCM)
    view.setUint16(20, 1, true); // audioFormat (1 for PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true); // avg. byte rate
    view.setUint16(32, channels * 2, true); // block-align
    view.setUint16(34, 16, true); // 16-bit

    // "data" sub-chunk
    view.setUint32(36, 0x61746164, true); // "data"
    view.setUint32(40, audioLength * 2, true); // chunkSize

    return new Uint8Array(header);
  }
}
