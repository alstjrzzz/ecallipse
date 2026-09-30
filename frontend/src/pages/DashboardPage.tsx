import {Link} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import {useSipPhone} from '../calls/SipPhoneContext';
import {ContactList} from '../components/ContactList';
import {CONTACTS, WIDGET_CATALOG} from '../data';
import {usePresets} from '../presets/PresetsContext';

export function DashboardPage() {
  const {user} = useAuth();
  const phone = useSipPhone();
  const {defaultPreset, presets} = usePresets();
  if (!user) return null;
  const contacts = CONTACTS.filter((contact) => contact.app?.userId !== user.id);
  const widgetTitles = [...new Set(defaultPreset.layout.map((widget) => WIDGET_CATALOG.find((item) => item.type === widget.type)?.title))].filter(Boolean);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div><span className="eyebrow">WORKSPACE</span><h1>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.name.split(' ')[0]}.</h1><p>Who do you need to move forward with today?</p></div>
        <div className={`connection-card connection-${phone.status}`}><i /><span><small>VOICE CHANNEL</small><strong>{phone.status}</strong></span></div>
      </header>

      {phone.error && <div className="inline-alert"><strong>Voice connection</strong>{phone.error}</div>}

      <section className="quick-call-section">
        <div className="section-heading"><div><h2>Quick call</h2><p>연락처를 선택하고 통화 구성과 연결 방식을 확인한 뒤 발신한다.</p></div><Link to="/app/contacts">View all contacts →</Link></div>
        <ContactList contacts={contacts} />
      </section>

      <section className="workspace-overview">
        <article className="workflow-card featured">
          <span className="eyebrow">DEFAULT CALL SETUP</span>
          <h2>{defaultPreset.name}</h2>
          <p>{defaultPreset.description || '통화를 시작할 때 기본으로 선택되는 구성이다.'} 통화 전에 Preset으로 미리 구성해 두면 발신과 수신 때는 고르기만 하면 된다.</p>
          <div className="widget-chips">{widgetTitles.map((title) => <span key={title}>{title}</span>)}</div>
          <Link to="/app/setup" className="button button-light setup-link">Edit call setup · {presets.length} presets</Link>
        </article>
        <article className="workflow-card result-preview">
          <span className="eyebrow">AFTER THE CALL</span>
          <h2>Results stay connected.</h2>
          <ul><li><i>✓</i> Transcript</li><li><i>✓</i> Captured next actions</li><li><i>○</i> Summary and integrations <small>next</small></li></ul>
        </article>
      </section>
    </div>
  );
}
