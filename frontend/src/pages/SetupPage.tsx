import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {NewPresetModal} from '../components/NewPresetModal';
import {DATA_SOURCE_LABELS} from '../data';
import type {WidgetPreset} from '../domain';
import {usePresets} from '../presets/PresetsContext';
import {WidgetPreview} from '../widgets/WidgetContent';
import {cloneLayout, ensureCallStage, requiredSources} from '../widgets/layout';
import {WidgetWorkspace} from '../widgets/WidgetWorkspace';

/** A minimal shape any preset-like source satisfies, so both a real preset and "blank" fit `startFrom`. */
type PresetSource = Pick<WidgetPreset, 'name' | 'description' | 'layout'>;

export function SetupPage() {
  const {myPresets, defaultPreset, getPreset, canEdit, create, update, remove, setDefault, loading, error} = usePresets();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Tabs are "my presets": the ones I can switch between and edit. Selecting a built-in or community
  // theme happens through "+ New tab", which duplicates it into my own tabs first.
  const selected = getPreset(selectedId ?? '')
    ?? myPresets.find((preset) => preset.id === defaultPreset.id)
    ?? myPresets[0];
  const editable = !!selected && canEdit(selected);
  const sources = selected ? requiredSources(selected.layout) : [];

  const startFrom = (source: PresetSource | null) => {
    void create(
      source ? `${source.name} 복사본` : '새 Preset',
      ensureCallStage(source ? cloneLayout(source.layout) : []),
      source?.description ?? '',
    ).then((created) => setSelectedId(created.id));
    setModalOpen(false);
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = myPresets.find((preset) => preset.id !== selected.id);
    remove(selected.id);
    setSelectedId(next?.id ?? null);
  };

  return (
    <div className="setup-page">
      <header className="page-header compact">
        <div>
          <span className="eyebrow">CALL SETUP</span>
          <h1>Compose before you call.</h1>
          <p>통화에 필요한 위젯을 Preset으로 미리 구성해 둔다. 발신과 수신 때는 Preset만 고르면 되고, 통화 중에는 그 통화에서만 조정할 수 있다.</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => navigate('/app/contacts')}>Start a call →</button>
      </header>

      {error && <div className="inline-alert in-list"><strong>Presets</strong>{error}</div>}

      <div className="preset-tabs" role="tablist" aria-label="My presets">
        {myPresets.map((preset) => (
          <button
            type="button"
            key={preset.id}
            role="tab"
            aria-selected={preset.id === selected?.id}
            className={`preset-tab${preset.id === selected?.id ? ' active' : ''}`}
            onClick={() => setSelectedId(preset.id)}
          >
            {preset.name}
            {preset.id === defaultPreset.id && <span className="tab-badge">default</span>}
          </button>
        ))}
        <button type="button" className="preset-tab-add" onClick={() => setModalOpen(true)}>＋ New tab</button>
      </div>

      {!selected && !loading && (
        <div className="new-preset-empty">아직 만든 Preset이 없다. "New tab"에서 기본 테마를 고르거나 빈 화면으로 시작한다.</div>
      )}

      {selected && (
        <section className="preset-editor">
          <div className="preset-meta-bar">
            <input className="preset-name-input" value={selected.name} onChange={(event) => update(selected.id, {name: event.target.value})} aria-label="Preset name" disabled={!editable} />
            <input className="preset-desc-input" value={selected.description} onChange={(event) => update(selected.id, {description: event.target.value})} placeholder="어떤 통화에 쓰는 구성인가" aria-label="Preset description" disabled={!editable} />
            <div className="preset-actions">
              <button type="button" onClick={() => setDefault(selected.id)} disabled={selected.id === defaultPreset.id}>Set as default</button>
              <button type="button" onClick={() => startFrom(selected)}>Duplicate</button>
              {editable && <button type="button" onClick={removeSelected} disabled={myPresets.length <= 1}>Delete</button>}
            </div>
          </div>

          <p className="source-line">
            <b>통화에서 켜지는 AI 데이터</b>
            {sources.length > 0
              ? sources.map((source) => <span key={source}>{DATA_SOURCE_LABELS[source]}</span>)
              : <em>없음 — 음성 인식과 AI 비용이 발생하지 않는다.</em>}
            <small>위젯은 화면일 뿐이라 Transcript 위젯을 빼도 Next Action이 쓰는 transcript는 유지된다. 메인 통화 화면(Call Stage)은 이동·크기 조절만 가능하고 제거할 수 없다.</small>
          </p>

          <div className="setup-canvas">
            <WidgetWorkspace
              key={selected.id}
              title={selected.name}
              hint="샘플 데이터로 보이는 미리보기. 실제 통화와 같은 캔버스다. 가장자리 근처에서는 서로 자석처럼 붙는다."
              layout={selected.layout}
              onLayoutChange={(layout) => update(selected.id, {layout})}
              readOnly={!editable}
              renderWidget={(widget) => <WidgetPreview type={widget.type} />}
            />
          </div>
        </section>
      )}

      {modalOpen && <NewPresetModal onClose={() => setModalOpen(false)} onPick={startFrom} />}
    </div>
  );
}
