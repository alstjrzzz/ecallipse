import {useEffect, useState} from 'react';
import {NavLink, Outlet, useNavigate} from 'react-router-dom';
import {callApi} from '../api';
import {useAuth} from '../auth/AuthContext';
import {useSipPhone} from '../calls/SipPhoneContext';
import {saveCallSetup} from '../calls/callSetup';
import {resolveParty} from '../calls/participants';
import {usePresets} from '../presets/PresetsContext';
import type {CallRealtimeEvent, CallSession} from '../domain';
import {cloneLayout} from '../widgets/layout';
import {Avatar} from './Avatar';
import {Brand} from './Brand';

const SIDEBAR_COLLAPSE_KEY = 'ecallipse.sidebar-collapsed';

export function AppShell() {
  const {user, signOut} = useAuth();
  const phone = useSipPhone();
  const navigate = useNavigate();
  const {presets, defaultPreset, getPreset} = usePresets();
  const [incomingPresetId, setIncomingPresetId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<CallSession | null>(null);
  const [handling, setHandling] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1');

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let disposed = false;
    let retryTimer: number | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      socket = new WebSocket(`${protocol}//${location.host}/ws/users/${encodeURIComponent(user.id)}`);
      socket.addEventListener('open', () => {
        void callApi.ringing(user.id).then((calls) => {
          if (!disposed && calls.length > 0) setIncoming(calls.at(-1) ?? null);
        });
      });
      socket.addEventListener('message', ({data}) => {
        const event = JSON.parse(String(data)) as CallRealtimeEvent;
        if (!disposed && event.type === 'call.incoming') setIncoming(event.payload as CallSession);
      });
      socket.addEventListener('close', () => {
        if (!disposed) retryTimer = window.setTimeout(connect, 1500);
      });
    };
    connect();
    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [user]);

  if (!user) return null;
  const caller = incoming ? resolveParty({type: 'INTERNAL_USER', address: incoming.callerId}) : undefined;
  // An offline callee is answered before the caller's voice leg exists, so app-level accept must not wait for SIP.
  const canAccept = phone.status === 'incoming' || (incoming?.delivery === 'APP_PUSH' && phone.status === 'registered');
  const incomingPreset = getPreset(incomingPresetId ?? '') ?? defaultPreset;

  const accept = async () => {
    if (!incoming || !canAccept) return;
    setHandling(true);
    try {
      await callApi.accept(incoming.id, user.id);
      saveCallSetup(user.id, incoming.id, {presetId: incomingPreset.id, layout: cloneLayout(incomingPreset.layout), goal: '', checklist: []});
      await phone.answer();
      navigate(`/calls/${incoming.id}`);
      setIncoming(null);
    } finally {
      setHandling(false);
    }
  };

  const decline = async () => {
    if (!incoming) return;
    setHandling(true);
    try {
      await callApi.hangup(incoming.id, user.id);
      await phone.hangup();
      setIncoming(null);
    } finally {
      setHandling(false);
    }
  };

  return (
    <div className={`app-frame${collapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="app-sidebar">
        <Brand />
        <button type="button" className="sidebar-collapse-toggle" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>‹</button>
        <nav className="app-nav">
          <NavLink to="/app" end><span>⌁</span> Workspace</NavLink>
          <NavLink to="/app/contacts"><span>◎</span> Contacts</NavLink>
          <NavLink to="/app/setup"><span>▤</span> Call setup</NavLink>
          <button type="button" disabled><span>◫</span> Call history <small>soon</small></button>
        </nav>
        <div className="sidebar-foot">
          <div className={`voice-pill voice-${phone.status}`}><i /> Voice {phone.status}</div>
          <button type="button" className="profile-row" onClick={() => { signOut(); navigate('/'); }}>
            <Avatar person={user} size="small" />
            <span><strong>{user.name}</strong><small>Sign out</small></span>
          </button>
        </div>
      </aside>
      <main className="app-main"><Outlet /></main>

      {incoming && (
        <div className="incoming-layer" role="dialog" aria-modal="true" aria-label="Incoming call">
          <div className="incoming-card">
            <div className="incoming-signal"><i /><i /><i /></div>
            {caller && <Avatar person={caller} size="large" />}
            <span className="eyebrow">INCOMING CALL</span>
            <h2>{caller?.name ?? incoming.callerId}</h2>
            <p>{phone.status === 'incoming' ? 'SIP 음성 채널 준비됨' : incoming.delivery === 'APP_PUSH' ? '알림을 받고 접속했습니다 · 수락하면 음성이 연결됩니다' : '앱 호출 수신 · SIP 음성 채널 연결 중'}</p>
            <label className="incoming-preset"><span>Workspace</span><select value={incomingPreset.id} onChange={(event) => setIncomingPresetId(event.target.value)} aria-label="Workspace preset">{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
            <div className="incoming-actions">
              <button type="button" className="call-control decline" onClick={() => void decline()} disabled={handling}>×</button>
              <button type="button" className="call-control accept" onClick={() => void accept()} disabled={handling || !canAccept} aria-label={canAccept ? 'Accept call' : 'Waiting for voice channel'}>⌕</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
