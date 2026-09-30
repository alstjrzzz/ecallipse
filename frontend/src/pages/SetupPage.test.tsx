import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {AuthProvider} from '../auth/AuthContext';
import {PresetsProvider} from '../presets/PresetsContext';
import {builtinPreset, installPresetApiMock} from '../test/mockPresetApi';
import {SetupPage} from './SetupPage';

const WORK_CALL_LAYOUT = [
  {id: 'call-stage-1', type: 'call-stage' as const, x: 20, y: 20, width: 380, height: 300, zIndex: 1},
  {id: 'transcript-2', type: 'transcript' as const, x: 420, y: 20, width: 400, height: 300, zIndex: 2},
  {id: 'next-action-3', type: 'next-action' as const, x: 420, y: 340, width: 400, height: 220, zIndex: 3},
];

const SEED = [
  builtinPreset({id: 'work-call', name: '업무 전화', layout: WORK_CALL_LAYOUT}),
  builtinPreset({id: 'light-call', name: '가볍게', layout: [{id: 'call-stage-1', type: 'call-stage', x: 20, y: 20, width: 380, height: 260, zIndex: 1}]}),
];

function renderSetup(seed = SEED) {
  const mock = installPresetApiMock(seed);
  render(
    <MemoryRouter>
      <AuthProvider>
        <PresetsProvider>
          <SetupPage />
        </PresetsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return mock;
}

describe('call setup page', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.setItem('ecallipse.session.user', 'alice');
  });

  it('starts empty for a new user and offers built-in themes through + New tab', async () => {
    renderSetup();
    expect(await screen.findByText(/아직 만든 Preset이 없다/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: /New tab/}));
    const modal = screen.getByRole('dialog', {name: 'New preset'});
    expect(within(modal).getByText('업무 전화')).toBeInTheDocument();

    await user.click(within(modal).getByText('업무 전화'));

    expect(await screen.findByRole('tab', {name: /업무 전화 복사본/})).toBeInTheDocument();
    expect(screen.getByText('Live Transcript')).toBeInTheDocument();
    expect(screen.getByText('Live transcript (STT)')).toBeInTheDocument();
  });

  it('keeps the transcript source when only the Live Transcript widget is removed', async () => {
    const mock = renderSetup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: /New tab/}));
    await user.click(within(screen.getByRole('dialog', {name: 'New preset'})).getByText('업무 전화'));
    await screen.findByRole('tab', {name: /업무 전화 복사본/});

    const transcriptFrame = screen.getByText('Live Transcript').closest('article')!;
    await user.click(within(transcriptFrame).getByRole('button', {name: 'Remove widget'}));

    expect(screen.queryByText('Live Transcript')).not.toBeInTheDocument();
    expect(screen.getByText('Live transcript (STT)')).toBeInTheDocument();
    expect(mock.presets.find((preset) => preset.name === '업무 전화 복사본')?.layout).toHaveLength(2);
  });

  it('does not let the call stage be removed, unlike an ordinary widget', async () => {
    const user = userEvent.setup();
    renderSetup();
    await user.click(screen.getByRole('button', {name: /New tab/}));
    await user.click(within(screen.getByRole('dialog', {name: 'New preset'})).getByText('업무 전화'));
    await screen.findByRole('tab', {name: /업무 전화 복사본/});

    const stageFrame = screen.getByText('Call Stage').closest('article')!;
    expect(within(stageFrame).queryByRole('button', {name: 'Remove widget'})).not.toBeInTheDocument();
    const transcriptFrame = screen.getByText('Live Transcript').closest('article')!;
    expect(within(transcriptFrame).getByRole('button', {name: 'Remove widget'})).toBeInTheDocument();
  });

  it('persists a duplicated preset to the shared backend under the creating user, without touching the built-in', async () => {
    const mock = renderSetup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: /New tab/}));
    await user.click(within(screen.getByRole('dialog', {name: 'New preset'})).getByText('업무 전화'));
    await screen.findByRole('tab', {name: /업무 전화 복사본/});

    const created = mock.presets.find((preset) => preset.name === '업무 전화 복사본');
    expect(created).toMatchObject({ownerId: 'alice', builtin: false});
    expect(mock.presets.find((preset) => preset.id === 'work-call')?.layout).toEqual(WORK_CALL_LAYOUT);
  });

  it('starting from Blank creates a preset with only the call stage', async () => {
    renderSetup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: /New tab/}));
    await user.click(within(screen.getByRole('dialog', {name: 'New preset'})).getByRole('button', {name: /Blank/}));

    expect(await screen.findByRole('tab', {name: /새 Preset/})).toBeInTheDocument();
    expect(screen.getByText('Call Stage')).toBeInTheDocument();
    expect(screen.queryByText('Live Transcript')).not.toBeInTheDocument();
    expect(screen.getByText(/음성 인식과 AI 비용이 발생하지 않는다/)).toBeInTheDocument();
  });
});
