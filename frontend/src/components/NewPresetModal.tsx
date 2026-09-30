import {useState, type KeyboardEvent} from 'react';
import {usePresets} from '../presets/PresetsContext';
import type {WidgetPreset} from '../domain';

type NewPresetModalProps = {
  onClose: () => void;
  /** null means start from a blank canvas (just the call stage). */
  onPick: (source: WidgetPreset | null) => void;
};

type Tab = 'builtin' | 'community' | 'mine';

const TAB_EMPTY_COPY: Record<Tab, string> = {
  builtin: '기본 테마가 없다.',
  community: '아직 다른 사용자가 공유한 테마가 없다.',
  mine: '아직 만든 Preset이 없다.',
};

/** Opened from the "+" tab in Call setup: pick a starting point for a new tab (my own preset). */
export function NewPresetModal({onClose, onPick}: NewPresetModalProps) {
  const {builtinPresets, communityPresets, myPresets} = usePresets();
  const [tab, setTab] = useState<Tab>('builtin');
  const list = tab === 'builtin' ? builtinPresets : tab === 'community' ? communityPresets : myPresets;

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  };

  return (
    <div className="new-preset-layer" role="dialog" aria-modal="true" aria-label="New preset" onKeyDown={closeOnEscape}>
      <div className="new-preset-modal">
        <header>
          <div>
            <span className="eyebrow">NEW TAB</span>
            <h2>Start a new preset.</h2>
            <p>빈 화면에서 시작하거나, 기본 제공 테마 또는 다른 사용자가 만든 테마를 복사해서 시작한다. 복사본은 내 탭에 추가되고 원본은 바뀌지 않는다.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="new-preset-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'builtin'} className={tab === 'builtin' ? 'active' : ''} onClick={() => setTab('builtin')}>Built-in themes</button>
          <button type="button" role="tab" aria-selected={tab === 'community'} className={tab === 'community' ? 'active' : ''} onClick={() => setTab('community')}>Community</button>
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>My presets</button>
        </div>

        <div className="new-preset-grid">
          <button type="button" className="new-preset-card new-preset-blank" onClick={() => onPick(null)}>
            <span className="new-preset-blank-icon">＋</span>
            <strong>Blank</strong>
          </button>
          {list.map((preset) => (
            <button type="button" key={preset.id} className="new-preset-card" onClick={() => onPick(preset)}>
              <strong>{preset.name}</strong>
              <span>{preset.description || '설명 없음'}</span>
              <small>{preset.layout.length}개 위젯{tab === 'community' && preset.ownerId ? ` · by ${preset.ownerId}` : ''}</small>
            </button>
          ))}
          {list.length === 0 && <div className="new-preset-empty">{TAB_EMPTY_COPY[tab]}</div>}
        </div>
      </div>
    </div>
  );
}
