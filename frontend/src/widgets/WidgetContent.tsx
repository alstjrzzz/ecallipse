import {useEffect, useMemo, useRef, useState, type CSSProperties} from 'react';
import {callApi} from '../api';
import {loadCallSetup} from '../calls/callSetup';
import type {Party} from '../calls/participants';
import {Avatar} from '../components/Avatar';
import type {CallSession, NextAction, TranscriptSegment, WidgetType} from '../domain';

type WidgetContentProps = {
  type: WidgetType;
  callId: string;
  call: CallSession | null;
  party?: Party;
  currentUserId: string;
  transcripts: TranscriptSegment[];
  nextAction: NextAction | null;
  voiceLabel: string;
};

export function WidgetContent(props: WidgetContentProps) {
  switch (props.type) {
    case 'call-stage': return <CallStageWidget {...props} />;
    case 'transcript': return <TranscriptWidget {...props} />;
    case 'next-action': return <NextActionWidget nextAction={props.nextAction} />;
    case 'checklist': return <ChecklistWidget callId={props.callId} userId={props.currentUserId} />;
    case 'notes': return <NotesWidget callId={props.callId} userId={props.currentUserId} />;
    case 'call-details': return <CallDetailsWidget {...props} />;
  }
}

/** The call itself: who you're talking to and the connection state. Always present, never removable. */
function CallStageWidget({call, party, voiceLabel}: WidgetContentProps) {
  return (
    <div className="call-stage-widget">
      {party ? <Avatar person={party} size="large" /> : <span className="avatar avatar-large" />}
      <span className="eyebrow">{call?.status ?? 'CONNECTING'}</span>
      <h2>{party?.name ?? 'Connecting…'}</h2>
      <p>{party?.role ?? ' '}</p>
      <div className="call-stage-status"><i className={`status-dot voice-${voiceLabel}`} />{voiceLabel}</div>
    </div>
  );
}

function TranscriptWidget({callId, call, currentUserId, transcripts}: WidgetContentProps) {
  const [demoText, setDemoText] = useState('내일까지 수정된 제안서를 확인하고 회신하기로 했습니다.');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({behavior: 'smooth'}); }, [transcripts.length]);

  const sendDemo = async () => {
    setSending(true);
    try {
      const nextSequence = transcripts.reduce((max, segment) => Math.max(max, segment.sequence), -1) + 1;
      await callApi.submitDemoTranscript(callId, currentUserId, demoText, nextSequence);
      setDemoText('다음 주 화요일 오전에 다시 확인 전화를 진행합니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="transcript-widget">
      <div className="transcript-feed">
        {transcripts.length === 0 && <div className="widget-empty"><span>◌</span><p>STT transcript가 도착하면 여기에 표시된다.</p></div>}
        {transcripts.map((segment) => (
          <div className="transcript-line" key={segment.segmentId}>
            <strong>{segment.speakerId}</strong><p>{segment.text}</p><small>#{segment.sequence} · {segment.finalSegment ? 'final' : 'partial'}</small>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="demo-transcript">
        <input value={demoText} onChange={(event) => setDemoText(event.target.value)} aria-label="Demo transcript" />
        <button type="button" onClick={() => void sendDemo()} disabled={call?.status !== 'ACTIVE' || sending}>POC 입력</button>
      </div>
    </div>
  );
}

function NextActionWidget({nextAction}: {nextAction: NextAction | null}) {
  return nextAction ? (
    <div className="next-action-widget"><span className="action-spark">✦</span><strong>{nextAction.text}</strong><small>final transcript #{nextAction.sourceRevision}에서 생성됨</small><button type="button" disabled>작업으로 저장 <i>soon</i></button></div>
  ) : (
    <div className="widget-empty next-empty"><span>✦</span><p>대화가 진행되면 다음 행동을 제안한다.</p></div>
  );
}

const DEFAULT_CHECKLIST = ['통화 목적 확인', '결정이 필요한 범위 합의', '담당자와 기한 확인'];

function ChecklistWidget({callId, userId}: {callId: string; userId: string}) {
  const key = `ecallipse.checklist.${userId}.${callId}`;
  const [items, setItems] = useState<Array<{text: string; done: boolean}>>(() => {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    // Items prepared before the call win over the generic defaults.
    const prepared = loadCallSetup(userId, callId)?.checklist ?? [];
    return (prepared.length > 0 ? prepared : DEFAULT_CHECKLIST).map((text) => ({text, done: false}));
  });
  useEffect(() => { localStorage.setItem(key, JSON.stringify(items)); }, [items, key]);
  return <div className="checklist-widget">{items.map((item, index) => <label key={`${item.text}-${index}`}><input type="checkbox" checked={item.done} onChange={() => setItems((current) => current.map((entry, itemIndex) => itemIndex === index ? {...entry, done: !entry.done} : entry))} /><span>{item.text}</span></label>)}</div>;
}

function NotesWidget({callId, userId}: {callId: string; userId: string}) {
  // Notes are private to the user, so the storage key and the cross-window channel are per user.
  const key = `ecallipse.notes.${userId}.${callId}`;
  const channelName = `ecallipse.notes.channel.${userId}.${callId}`;
  const [note, setNote] = useState(() => localStorage.getItem(key) ?? '');
  const channel = useMemo(() => typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName), [channelName]);

  useEffect(() => {
    if (!channel) return;
    const receive = (event: MessageEvent) => setNote(String(event.data));
    channel.addEventListener('message', receive);
    return () => {
      channel.removeEventListener('message', receive);
      channel.close();
    };
  }, [channel]);

  const update = (value: string) => {
    setNote(value);
    localStorage.setItem(key, value);
    channel?.postMessage(value);
  };

  return <textarea className="notes-widget" value={note} onChange={(event) => update(event.target.value)} placeholder="통화 중 기억할 내용을 적어 두세요…" />;
}

function CallDetailsWidget({call, party, voiceLabel}: WidgetContentProps) {
  return (
    <dl className="call-details-widget">
      <div><dt>Participant</dt><dd>{party?.name ?? 'Unknown'}</dd></div>
      <div><dt>Business state</dt><dd><i className={`status-dot status-${call?.status?.toLowerCase()}`} />{call?.status ?? 'LOADING'}</dd></div>
      <div><dt>Voice channel</dt><dd><i className={`status-dot voice-${voiceLabel}`} />{voiceLabel}</dd></div>
      <div><dt>Call ID</dt><dd className="mono">{call?.id.slice(0, 8) ?? '—'}</dd></div>
    </dl>
  );
}

/** Static sample content shown while composing a preset, before any call exists. Nothing here reads or writes call data. */
export function WidgetPreview({type}: {type: WidgetType}) {
  switch (type) {
    case 'call-stage':
      return (
        <div className="call-stage-widget">
          <span className="avatar avatar-large" style={{'--avatar-accent': '#8b7cf6'} as CSSProperties}>?</span>
          <span className="eyebrow">ACTIVE</span>
          <h2>상대방</h2>
          <p>sample</p>
          <div className="call-stage-status"><i className="status-dot voice-in-call" />in-call</div>
        </div>
      );
    case 'transcript':
      return (
        <div className="transcript-widget"><div className="transcript-feed">
          <div className="transcript-line"><strong>Alice</strong><p>다음 주 화요일까지 견적서를 보내 드릴게요.</p><small>sample</small></div>
          <div className="transcript-line"><strong>Bob</strong><p>좋아요. 금액 범위는 그때 확정하죠.</p><small>sample</small></div>
        </div></div>
      );
    case 'next-action':
      return <div className="next-action-widget"><span className="action-spark">✦</span><strong>화요일 오전에 견적서 회신하기</strong><small>sample · 실제 통화에서는 transcript에서 생성된다</small></div>;
    case 'checklist':
      return <div className="checklist-widget">{DEFAULT_CHECKLIST.map((text) => <label key={text}><input type="checkbox" disabled /><span>{text}</span></label>)}</div>;
    case 'notes':
      return <textarea className="notes-widget" disabled placeholder="통화 중 기억할 내용을 적어 두세요…" />;
    case 'call-details':
      return (
        <dl className="call-details-widget">
          <div><dt>Participant</dt><dd>상대방</dd></div>
          <div><dt>Business state</dt><dd>ACTIVE</dd></div>
          <div><dt>Voice channel</dt><dd>in-call</dd></div>
        </dl>
      );
  }
}
