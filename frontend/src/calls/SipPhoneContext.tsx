/* oxlint-disable react-refresh/only-export-components */
import {
  Invitation,
  Inviter,
  Registerer,
  RegistererState,
  Session,
  SessionState,
  UserAgent,
  Web,
} from 'sip.js';
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren} from 'react';
import {useAuth} from '../auth/AuthContext';

export type VoiceStatus = 'disabled' | 'connecting' | 'registered' | 'incoming' | 'calling' | 'in-call' | 'error';

type SipPhoneContextValue = {
  status: VoiceStatus;
  error: string | null;
  incomingCaller: string | null;
  muted: boolean;
  /** Microphone stream of the established call, the same track the call sends. */
  localStream: MediaStream | null;
  call: (extension: string) => Promise<void>;
  answer: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
};

const SipPhoneContext = createContext<SipPhoneContextValue | null>(null);
const MEDIA_OPTIONS = {sessionDescriptionHandlerOptions: {constraints: {audio: true, video: false}}};

export function SipPhoneProvider({children}: PropsWithChildren) {
  const {user} = useAuth();
  const [status, setStatus] = useState<VoiceStatus>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [incomingCaller, setIncomingCaller] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const userAgentRef = useRef<UserAgent | null>(null);
  const registererRef = useRef<Registerer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // The app-level accept can happen before the caller's SIP INVITE exists (callee was offline when the call started).
  const answerUntilRef = useRef(0);

  const attachRemoteAudio = useCallback((session: Session) => {
    const handler = session.sessionDescriptionHandler;
    if (!(handler instanceof Web.SessionDescriptionHandler) || !audioRef.current) return;
    audioRef.current.srcObject = handler.remoteMediaStream;
    void audioRef.current.play().catch(() => {
      setError('원격 오디오 재생을 허용하려면 통화 화면을 한 번 클릭해 주세요.');
    });
  }, []);

  const wireSession = useCallback((session: Session) => {
    sessionRef.current = session;
    session.stateChange.addListener((nextState) => {
      if (nextState === SessionState.Established) {
        setStatus('in-call');
        setIncomingCaller(null);
        attachRemoteAudio(session);
        const handler = session.sessionDescriptionHandler;
        if (handler instanceof Web.SessionDescriptionHandler) setLocalStream(handler.localMediaStream);
      }
      if (nextState === SessionState.Terminated) {
        if (sessionRef.current === session) sessionRef.current = null;
        setMuted(false);
        setLocalStream(null);
        setIncomingCaller(null);
        setStatus(registererRef.current?.state === RegistererState.Registered ? 'registered' : 'disabled');
      }
    });
  }, [attachRemoteAudio]);

  useEffect(() => {
    if (!user) {
      // The external SIP connection follows the authenticated session.
      // oxlint-disable-next-line react-hooks/set-state-in-effect
      setStatus('disabled');
      return;
    }

    const wsServer = import.meta.env.VITE_SIP_WS_URL ?? 'ws://127.0.0.1:5066';
    const domain = import.meta.env.VITE_SIP_DOMAIN ?? 'localhost';
    const password = import.meta.env.VITE_SIP_PASSWORD ?? 'ecallipse';
    const uri = UserAgent.makeURI(`sip:${user.sipExtension}@${domain}`);
    if (!uri) {
      setStatus('error');
      setError('SIP 주소를 만들 수 없습니다.');
      return;
    }

    let disposed = false;
    setStatus('connecting');
    setError(null);
    const userAgent = new UserAgent({
      uri,
      displayName: user.name,
      authorizationUsername: user.sipExtension,
      authorizationPassword: password,
      transportOptions: {server: wsServer},
      delegate: {
        onInvite(invitation) {
          if (disposed) return;
          wireSession(invitation);
          if (Date.now() < answerUntilRef.current) {
            answerUntilRef.current = 0;
            invitation.accept(MEDIA_OPTIONS).catch((reason: unknown) => {
              setStatus('error');
              setError(reason instanceof Error ? reason.message : 'SIP 통화를 수락하지 못했습니다.');
            });
            return;
          }
          setIncomingCaller(invitation.remoteIdentity.displayName || invitation.remoteIdentity.uri.user || 'Unknown caller');
          setStatus('incoming');
        },
      },
    });
    const registerer = new Registerer(userAgent);
    userAgentRef.current = userAgent;
    registererRef.current = registerer;
    registerer.stateChange.addListener((state) => {
      if (disposed) return;
      if (state === RegistererState.Registered && !sessionRef.current) setStatus('registered');
      if (state === RegistererState.Terminated && !sessionRef.current) setStatus('disabled');
    });

    void userAgent.start()
      .then(() => registerer.register())
      .catch((reason: unknown) => {
        if (disposed) return;
        setStatus('error');
        setError(reason instanceof Error ? reason.message : 'FreeSWITCH에 연결하지 못했습니다.');
      });

    return () => {
      disposed = true;
      sessionRef.current = null;
      registererRef.current = null;
      userAgentRef.current = null;
      void registerer.unregister().catch(() => undefined);
      void userAgent.stop().catch(() => undefined);
    };
  }, [user, wireSession]);

  const call = useCallback(async (extension: string) => {
    const userAgent = userAgentRef.current;
    const domain = import.meta.env.VITE_SIP_DOMAIN ?? 'localhost';
    if (!userAgent || registererRef.current?.state !== RegistererState.Registered) {
      throw new Error('음성 채널이 연결되지 않았습니다. FreeSWITCH 상태를 확인해 주세요.');
    }
    const target = UserAgent.makeURI(`sip:${extension}@${domain}`);
    if (!target) throw new Error('상대 SIP 주소를 만들 수 없습니다.');

    setError(null);
    setStatus('calling');
    const inviter = new Inviter(userAgent, target);
    wireSession(inviter);
    try {
      await inviter.invite(MEDIA_OPTIONS);
    } catch (reason) {
      setStatus('error');
      setError(reason instanceof Error ? reason.message : 'SIP 발신에 실패했습니다.');
      throw reason;
    }
  }, [wireSession]);

  const answer = useCallback(async () => {
    const session = sessionRef.current;
    setError(null);
    if (session instanceof Invitation) {
      await session.accept(MEDIA_OPTIONS);
      return;
    }
    // No INVITE yet: answer it as soon as the caller's voice leg arrives.
    answerUntilRef.current = Date.now() + 30_000;
  }, []);

  const hangup = useCallback(async () => {
    answerUntilRef.current = 0;
    const session = sessionRef.current;
    if (!session || session.state === SessionState.Terminated) return;
    if (session.state === SessionState.Established) {
      await session.bye();
    } else if (session instanceof Inviter) {
      await session.cancel();
    } else if (session instanceof Invitation) {
      await session.reject();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const handler = sessionRef.current?.sessionDescriptionHandler;
    if (!(handler instanceof Web.SessionDescriptionHandler)) return;
    const nextMuted = !muted;
    handler.enableSenderTracks(!nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  const value = useMemo<SipPhoneContextValue>(() => ({
    status,
    error,
    incomingCaller,
    muted,
    localStream,
    call,
    answer,
    hangup,
    toggleMute,
  }), [status, error, incomingCaller, muted, localStream, call, answer, hangup, toggleMute]);

  return (
    <SipPhoneContext.Provider value={value}>
      {children}
      <audio ref={audioRef} autoPlay className="remote-audio" aria-hidden="true" />
    </SipPhoneContext.Provider>
  );
}

export function useSipPhone() {
  const context = useContext(SipPhoneContext);
  if (!context) throw new Error('useSipPhone must be used inside SipPhoneProvider');
  return context;
}
