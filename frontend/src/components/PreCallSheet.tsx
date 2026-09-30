import {useState, type FormEvent, type KeyboardEvent} from 'react';
import {Link} from 'react-router-dom';
import {parseChecklist} from '../calls/callSetup';
import type {StartCallOptions} from '../calls/useStartCall';
import {DATA_SOURCE_LABELS, WIDGET_CATALOG} from '../data';
import type {CallRoute, Contact} from '../domain';
import {usePresets} from '../presets/PresetsContext';
import {cloneLayout, requiredSources} from '../widgets/layout';
import {Avatar} from './Avatar';

type PreCallSheetProps = {
  contact: Contact;
  online?: boolean;
  starting: boolean;
  error: string | null;
  onClose: () => void;
  onStart: (options: StartCallOptions) => void;
};

function routeNote(route: CallRoute, online: boolean | undefined) {
  if (route === 'phone') return '전화망으로 발신한다. POC에서는 더미 전화망이 잠시 후 응답하며 음성은 연결되지 않는다.';
  if (online === undefined) return '앱으로 발신한다.';
  return online
    ? '상대가 앱을 열어 두고 있다. 바로 수신 화면이 뜬다.'
    : '상대가 오프라인이다. 푸시 알림(POC: 더미)을 보내고, 상대가 앱에 접속하면 수신 화면이 뜬다.';
}

export function PreCallSheet({contact, online, starting, error, onClose, onStart}: PreCallSheetProps) {
  const {presets, defaultPreset} = usePresets();
  const [route, setRoute] = useState<CallRoute>(contact.app ? 'app' : 'phone');
  const [presetId, setPresetId] = useState(defaultPreset.id);
  const [goal, setGoal] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const preset = presets.find((item) => item.id === presetId) ?? defaultPreset;
  const sources = requiredSources(preset.layout);
  const hasChecklist = preset.layout.some((widget) => widget.type === 'checklist');
  const widgetTitles = [...new Set(preset.layout.map((widget) => WIDGET_CATALOG.find((item) => item.type === widget.type)?.title))].filter(Boolean);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (starting) return;
    onStart({
      route,
      setup: {
        presetId: preset.id,
        layout: cloneLayout(preset.layout),
        goal: goal.trim(),
        checklist: hasChecklist ? parseChecklist(checklistText) : [],
      },
    });
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !starting) onClose();
  };

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`Call ${contact.name}`} onKeyDown={closeOnEscape}>
      <form className="call-sheet" onSubmit={submit}>
        <header>
          <Avatar person={contact} />
          <span><small>START A CALL</small><strong>{contact.name}</strong><em>{contact.role}</em></span>
        </header>

        {contact.app && contact.phoneNumber && (
          <fieldset className="sheet-section">
            <legend>How to reach</legend>
            <div className="segmented">
              <label className={route === 'app' ? 'selected' : ''}><input type="radio" name="route" checked={route === 'app'} onChange={() => setRoute('app')} />App{online !== undefined && <i className={online ? 'on' : ''} />}</label>
              <label className={route === 'phone' ? 'selected' : ''}><input type="radio" name="route" checked={route === 'phone'} onChange={() => setRoute('phone')} />Phone <small>{contact.phoneNumber}</small></label>
            </div>
          </fieldset>
        )}
        <p className="route-note">{routeNote(route, online)}</p>

        <fieldset className="sheet-section">
          <legend>Workspace <Link to="/app/setup">Edit presets →</Link></legend>
          <div className="preset-choices">
            {presets.map((item) => (
              <label key={item.id} className={item.id === preset.id ? 'selected' : ''}>
                <input type="radio" name="preset" checked={item.id === preset.id} onChange={() => setPresetId(item.id)} />
                <strong>{item.name}{item.id === defaultPreset.id && <small>default</small>}</strong>
                <span>{item.layout.length === 0 ? '위젯 없음' : `${item.layout.length}개 위젯`}</span>
              </label>
            ))}
          </div>
          <p className="sheet-hint">{widgetTitles.join(' · ') || '통화 화면만 표시된다.'}</p>
          <p className="sheet-hint">{sources.length > 0 ? `AI 데이터: ${sources.map((source) => DATA_SOURCE_LABELS[source]).join(', ')}이(가) 켜진다.` : 'AI 데이터를 쓰지 않는다. 음성 인식 비용이 발생하지 않는다.'}</p>
        </fieldset>

        <fieldset className="sheet-section">
          <legend>Before you call <small>optional</small></legend>
          <input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="이번 통화의 목적" aria-label="Call goal" autoFocus />
          {hasChecklist
            ? <textarea value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder={'확인할 내용 (한 줄에 하나씩)\n예: 예약 가능 시간\n예: 취소 수수료'} aria-label="Checklist items" rows={3} />
            : <p className="sheet-hint">이 Preset에는 Checklist가 없어 확인 항목을 준비할 수 없다.</p>}
        </fieldset>

        {error && <div className="inline-alert in-list"><strong>Call setup</strong>{error}</div>}
        <footer>
          <button type="button" className="button button-ghost" onClick={onClose} disabled={starting}>Cancel</button>
          <button type="submit" className="button button-primary" disabled={starting}>{starting ? 'Connecting…' : `Call ${contact.name.split(' ')[0]}`}</button>
        </footer>
      </form>
    </div>
  );
}
