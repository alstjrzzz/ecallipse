import {useParams} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import {counterpartOf, resolveParty} from '../calls/participants';
import {useCallRealtime} from '../calls/useCallRealtime';
import {useSipPhone} from '../calls/SipPhoneContext';
import {WIDGET_CATALOG} from '../data';
import type {WidgetType} from '../domain';
import {WidgetContent} from '../widgets/WidgetContent';

const WIDGET_TYPES = WIDGET_CATALOG.map((item) => item.type);

export function DetachedWidgetPage() {
  const {callId, widgetType} = useParams();
  const {user} = useAuth();
  const phone = useSipPhone();
  const realtime = useCallRealtime(callId);
  if (!callId || !user || !widgetType || !WIDGET_TYPES.includes(widgetType as WidgetType)) return null;
  const type = widgetType as WidgetType;
  const party = realtime.call ? resolveParty(counterpartOf(realtime.call, user.id)) : undefined;
  const voiceLabel = realtime.call?.delivery === 'PHONE_NETWORK' ? 'dummy' : phone.status;
  const title = WIDGET_CATALOG.find((item) => item.type === type)?.title;

  return (
    <main className="detached-widget-page">
      <header><div><i /><strong>{title}</strong></div><span>{realtime.connected ? 'Live' : 'Reconnecting'}</span></header>
      <section><WidgetContent type={type} callId={callId} call={realtime.call} party={party} currentUserId={user.id} transcripts={realtime.transcripts} nextAction={realtime.nextAction} voiceLabel={voiceLabel} /></section>
    </main>
  );
}
