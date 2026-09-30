import {useEffect} from 'react';

const TARGET_SAMPLE_RATE = 16_000;

// Downsamples the microphone to 16 kHz mono PCM16 and posts ~100 ms chunks to the main thread.
const WORKLET_SOURCE = `
class Pcm16Capture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / ${TARGET_SAMPLE_RATE};
    this.position = 0;
    this.chunk = new Int16Array(${TARGET_SAMPLE_RATE / 10});
    this.length = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    while (this.position < input.length) {
      const sample = Math.max(-1, Math.min(1, input[Math.floor(this.position)]));
      this.chunk[this.length++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.length === this.chunk.length) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(${TARGET_SAMPLE_RATE / 10});
        this.length = 0;
      }
      this.position += this.ratio;
    }
    this.position -= input.length;
    return true;
  }
}
registerProcessor('pcm16-capture', Pcm16Capture);
`;

let workletUrl: string | undefined;

/**
 * Streams this user's own microphone to the backend for live transcription.
 * Each participant sends only their own voice, so the backend knows the speaker without diarization.
 */
export function useCallTranscription(callId: string | undefined, userId: string | undefined, stream: MediaStream | null) {
  useEffect(() => {
    if (!callId || !userId || !stream) return;
    workletUrl ??= URL.createObjectURL(new Blob([WORKLET_SOURCE], {type: 'text/javascript'}));
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/ws/calls/${callId}/audio?userId=${encodeURIComponent(userId)}`);
    socket.binaryType = 'arraybuffer';
    const context = new AudioContext();
    let disposed = false;

    void context.audioWorklet.addModule(workletUrl).then(() => {
      if (disposed) return;
      const capture = new AudioWorkletNode(context, 'pcm16-capture');
      capture.port.onmessage = ({data}: MessageEvent<ArrayBuffer>) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(data);
      };
      context.createMediaStreamSource(stream).connect(capture);
      // The node outputs silence; connecting it keeps the graph pulling audio through it.
      capture.connect(context.destination);
    }).catch(() => undefined);

    return () => {
      disposed = true;
      socket.close();
      void context.close();
    };
  }, [callId, userId, stream]);
}
