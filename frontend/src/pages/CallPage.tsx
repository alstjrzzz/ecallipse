import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {callApi} from '../api';
import {useAuth} from '../auth/AuthContext';
import {loadCallSetup, saveCallSetup} from '../calls/callSetup';
import {counterpartOf, resolveParty} from '../calls/participants';
import {useCallRealtime} from '../calls/useCallRealtime';
import {useSipPhone} from '../calls/SipPhoneContext';
import {Avatar} from '../components/Avatar';
import {Brand} from '../components/Brand';
import type {CallDelivery, CallSetup, WidgetLayout} from '../domain';
import {usePresets} from '../presets/PresetsContext';
import {WidgetContent} from '../widgets/WidgetContent';
import {WidgetWorkspace} from '../widgets/WidgetWorkspace';
import {cloneLayout, ensureCallStage} from '../widgets/layout';

const DELIVERY_LABEL: Record<CallDelivery, string> = {
  APP_REALTIME: 'App',
  APP_PUSH: 'App · push',
  PHONE_NETWORK: 'Phone (dummy)',
};

export function CallPage() {
  const {callId} = useParams();
  const {user} = useAuth();
  const phone = useSipPhone();
  const presets = usePresets();
  const navigate = useNavigate();
  const realtime = useCallRealtime(callId);
  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);
  const [savedToPreset, setSavedToPreset] = useState(false);
  const [setup, setSetup] = useState<CallSetup>(() => {
    const loaded = user && callId ? loadCallSetup(user.id, callId) : null;
    const base = loaded ?? {presetId: presets.defaultPreset.id, layout: cloneLayout(presets.defaultPreset.layout), goal: '', checklist: []};
    // Defensive: a layout saved before the call stage existed, or one with no widgets at all, still gets one.
    return {...base, layout: ensureCallStage(base.layout)};
  });
  const voiceDialed = useRef(false);

  const call = realtime.call;
  const party = call && user ? resolveParty(counterpartOf(call, user.id)) : undefined;
  const isCaller = !!call && call.callerId === user?.id;
  const phoneNetwork = call?.delivery === 'PHONE_NETWORK';
  const voiceLabel = phoneNetwork ? 'dummy' : phone.status;
  const sourcePreset = presets.getPreset(setup.presetId);
  const canSaveToPreset = !!sourcePreset && presets.canEdit(sourcePreset);

  useEffect(() => {
    if (call?.status !== 'ACTIVE') return;
    const acceptedAt = call.acceptedAt ? new Date(call.acceptedAt).getTime() : Date.now();
    const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - acceptedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [call?.status, call?.acceptedAt]);

  useEffect(() => {
    if (call?.status === 'ENDED') navigate(`/calls/${callId}/result`, {replace: true});
  }, [call?.status, callId, navigate]);

  // An offline callee was not dialed at call start. The caller opens the voice leg once the callee accepts.
  useEffect(() => {
    if (!call || !party?.app || voiceDialed.current) return;
    if (!isCaller || call.delivery !== 'APP_PUSH' || call.status !== 'ACTIVE' || phone.status !== 'registered') return;
    voiceDialed.current = true;
    phone.call(party.app.sipExtension).catch((reason: unknown) => {
      setControlError(reason instanceof Error ? reason.message : '음성 채널을 연결하지 못했습니다.');
    });
  }, [call, party?.app, isCaller, phone]);

  const duration = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);

  const endCall = async () => {
    if (!callId || !user) return;
    setEnding(true);
    try {
      await Promise.allSettled([
        phone.hangup(),
        call?.status === 'ENDED' ? Promise.resolve() : callApi.hangup(callId, user.id),
      ]);
      navigate(`/calls/${callId}/result`);
    } finally {
      setEnding(false);
    }
  };

  const retryVoice = async () => {
    if (!party?.app) return;
    setControlError(null);
    try {
      await phone.call(party.app.sipExtension);
    } catch (reason) {
      setControlError(reason instanceof Error ? reason.message : '음성 채널을 연결하지 못했습니다.');
    }
  };

  const changeLayout = (layout: WidgetLayout[]) => {
    const next = {...setup, layout};
    setSetup(next);
    setSavedToPreset(false);
    if (user && callId) saveCallSetup(user.id, callId, next);
  };

  const saveToPreset = () => {
    if (!sourcePreset || !canSaveToPreset) return;
    presets.update(sourcePreset.id, {layout: cloneLayout(setup.layout)});
    setSavedToPreset(true);
  };

  const popOut = (widget: WidgetLayout) => {
    window.open(
      `/calls/${callId}/widgets/${widget.type}`,
      `ecallipse-${callId}-${widget.id}`,
      `popup=yes,width=${Math.max(widget.width, 420)},height=${Math.max(widget.height, 360)},left=${widget.x + 120},top=${widget.y + 80}`,
    );
  };

  if (!callId || !user) return null;
  const statusLabel = call?.status === 'ACTIVE' ? duration : call?.status === 'RINGING' ? (phoneNetwork ? 'Dialing…' : 'Calling…') : 'Connecting…';
  const showRetry = isCaller && !phoneNetwork && call?.status === 'ACTIVE' && (phone.status === 'error' || phone.status === 'registered');

  return (
    <div className="call-page">
      <header className="call-topbar">
        <Brand />
        <div className="call-person-compact">
          {party && <Avatar person={party} size="small" />}
          <span><strong>{party?.name ?? 'Connecting'}</strong><small><i className={`status-dot voice-${voiceLabel}`} /> {voiceLabel} · {statusLabel}</small></span>
        </div>
        <div className="call-top-status"><span className={realtime.connected ? 'online' : ''}><i /> App realtime</span><button type="button" onClick={() => navigate('/app')}>Minimize</button></div>
      </header>

      <main className="call-body">
        <aside className="call-rail">
          {setup.goal && <div className="call-goal"><span>GOAL</span><p>{setup.goal}</p></div>}

          <div className="voice-diagnostics">
            <div><span>Route</span><strong>{call ? DELIVERY_LABEL[call.delivery] : 'loading'}</strong></div>
            <div><span>Voice</span><strong className={`voice-text-${voiceLabel}`}>{voiceLabel}</strong></div>
            <div><span>Business state</span><strong>{call?.status ?? 'loading'}</strong></div>
            {isCaller && call?.status === 'RINGING' && call.delivery === 'APP_PUSH' && <p className="diagnostic-note">상대가 오프라인이라 푸시 알림을 보냈다. 앱에 접속해 수락하면 음성이 연결된다.</p>}
            {phoneNetwork && <p className="diagnostic-note">더미 전화망 통화다. 응답 시뮬레이션만 하고 음성은 연결되지 않는다.</p>}
            {!phoneNetwork && phone.error && <p>{phone.error}</p>}
            {controlError && <p>{controlError}</p>}
            {showRetry && <button type="button" onClick={() => void retryVoice()}>Retry voice call</button>}
          </div>

          <div className="call-controls">
            <button type="button" className={phone.muted ? 'active' : ''} onClick={phone.toggleMute} disabled={phoneNetwork}><span>{phone.muted ? '×' : '◉'}</span>{phone.muted ? 'Unmute' : 'Mute'}</button>
            <button type="button" disabled><span>▦</span>Keypad</button>
            <button type="button" disabled><span>···</span>More</button>
          </div>
          <button type="button" className="hangup-button" onClick={() => void endCall()} disabled={ending}><span>×</span>{ending ? 'Ending…' : 'End call'}</button>
        </aside>

        <WidgetWorkspace
          layout={setup.layout}
          onLayoutChange={changeLayout}
          onPopOut={popOut}
          title={sourcePreset ? `Call workspace · ${sourcePreset.name}` : 'Call workspace'}
          hint="이 통화에서만 적용된다. Preset에는 저장할 때만 반영된다."
          toolbarExtra={canSaveToPreset && <button type="button" className="button button-small button-quiet" onClick={saveToPreset} disabled={savedToPreset}>{savedToPreset ? 'Saved to preset' : 'Save to preset'}</button>}
          renderWidget={(widget) => (
            <WidgetContent
              type={widget.type}
              callId={callId}
              call={call}
              party={party}
              currentUserId={user.id}
              transcripts={realtime.transcripts}
              nextAction={realtime.nextAction}
              voiceLabel={voiceLabel}
            />
          )}
        />
      </main>
    </div>
  );
}
