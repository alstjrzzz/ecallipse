import {useMemo} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import {useCallRealtime} from '../calls/useCallRealtime';
import {Avatar} from '../components/Avatar';
import {Brand} from '../components/Brand';
import {counterpartOf, resolveParty} from '../calls/participants';

export function CallResultPage() {
  const {callId} = useParams();
  const {user} = useAuth();
  const realtime = useCallRealtime(callId);
  const contact = realtime.call && user ? resolveParty(counterpartOf(realtime.call, user.id)) : undefined;
  const duration = useMemo(() => {
    if (!realtime.call?.acceptedAt || !realtime.call.endedAt) return 'Not connected';
    const seconds = Math.max(0, Math.floor((new Date(realtime.call.endedAt).getTime() - new Date(realtime.call.acceptedAt).getTime()) / 1000));
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }, [realtime.call]);

  return (
    <div className="result-page">
      <header><Brand /><Link to="/app" className="button button-ghost">Back to workspace</Link></header>
      <main>
        <section className="result-hero">
          <span className="result-check">✓</span>
          <span className="eyebrow">CALL COMPLETE</span>
          <h1>Conversation captured.</h1>
          <div className="result-person">{contact && <Avatar person={contact} />}<span><strong>{contact?.name}</strong><small>{duration}</small></span></div>
        </section>
        <section className="result-grid">
          <article className="result-card transcript-result"><header><span>Transcript</span><strong>{realtime.transcripts.length} segments</strong></header>{realtime.transcripts.length === 0 ? <p className="empty-copy">STT transcript가 아직 없다.</p> : realtime.transcripts.map((segment) => <p key={segment.segmentId}><b>{segment.speakerId}</b>{segment.text}</p>)}</article>
          <article className="result-card"><header><span>Next action</span><strong>AI</strong></header><p>{realtime.nextAction?.text ?? '통화 중 생성된 Next Action이 없다.'}</p></article>
          <article className="result-card muted-card"><header><span>Summary</span><strong>Next stage</strong></header><p>요약, 결정사항, 미해결 항목은 실제 STT/LLM 연결 후 검증한다.</p></article>
        </section>
      </main>
    </div>
  );
}
