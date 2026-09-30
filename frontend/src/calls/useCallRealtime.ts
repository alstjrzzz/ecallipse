import {useCallback, useEffect, useRef, useState} from 'react';
import {callApi} from '../api';
import type {CallRealtimeEvent, CallSession, NextAction, TranscriptSegment} from '../domain';

export function useCallRealtime(callId: string | undefined) {
  const [call, setCall] = useState<CallSession | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [nextAction, setNextAction] = useState<NextAction | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEventSequence = useRef(0);

  const refresh = useCallback(async () => {
    if (!callId) return;
    try {
      const [currentCall, currentTranscript] = await Promise.all([
        callApi.get(callId),
        callApi.transcript(callId),
      ]);
      setCall(currentCall);
      setTranscripts(currentTranscript);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '통화 정보를 불러오지 못했습니다.');
    }
  }, [callId]);

  useEffect(() => {
    // Fetching the current snapshot closes the gap before WebSocket subscription.
    // oxlint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!callId) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let disposed = false;
    let retryTimer: number | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      socket = new WebSocket(`${protocol}//${location.host}/ws/calls/${callId}`);
      socket.addEventListener('open', () => {
        if (!disposed) setConnected(true);
      });
      socket.addEventListener('message', ({data}) => {
        if (disposed) return;
        const event = JSON.parse(String(data)) as CallRealtimeEvent;
        if (event.eventSequence <= lastEventSequence.current) return;
        lastEventSequence.current = event.eventSequence;
        if (event.type.startsWith('call.')) setCall(event.payload as CallSession);
        if (event.type === 'transcript.updated') {
          const segment = event.payload as TranscriptSegment;
          setTranscripts((current) => [...current.filter((item) => item.segmentId !== segment.segmentId), segment]
            .sort((left, right) => left.sequence - right.sequence));
        }
        if (event.type === 'assistance.next-action') setNextAction(event.payload as NextAction);
      });
      socket.addEventListener('close', () => {
        if (disposed) return;
        setConnected(false);
        retryTimer = window.setTimeout(connect, 1500);
      });
      socket.addEventListener('error', () => setConnected(false));
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [callId]);

  return {call, transcripts, nextAction, connected, error, refresh};
}
