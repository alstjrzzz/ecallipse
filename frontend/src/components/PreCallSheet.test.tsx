import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AuthProvider} from '../auth/AuthContext';
import {CONTACTS} from '../data';
import {PresetsProvider} from '../presets/PresetsContext';
import {builtinPreset, installPresetApiMock} from '../test/mockPresetApi';
import {PreCallSheet} from './PreCallSheet';

const contact = (id: string) => CONTACTS.find((item) => item.id === id)!;

// The first (insertion-order) preset becomes the fallback default when nothing else picks one.
const SEED = [
  builtinPreset({
    id: 'work-call',
    name: '업무 전화',
    layout: [
      {id: 'call-stage-1', type: 'call-stage', x: 20, y: 20, width: 380, height: 300, zIndex: 1},
      {id: 'transcript-2', type: 'transcript', x: 420, y: 20, width: 400, height: 300, zIndex: 2},
      {id: 'checklist-3', type: 'checklist', x: 20, y: 340, width: 380, height: 220, zIndex: 3},
    ],
  }),
  builtinPreset({
    id: 'light-call',
    name: '가볍게',
    layout: [
      {id: 'call-stage-1', type: 'call-stage', x: 20, y: 20, width: 380, height: 260, zIndex: 1},
      {id: 'notes-2', type: 'notes', x: 420, y: 20, width: 400, height: 380, zIndex: 2},
    ],
  }),
];

function renderSheet(id: string, online: boolean | undefined) {
  installPresetApiMock(SEED);
  const onStart = vi.fn();
  render(
    <MemoryRouter>
      <AuthProvider>
        <PresetsProvider>
          <PreCallSheet contact={contact(id)} online={online} starting={false} error={null} onClose={() => undefined} onStart={onStart} />
        </PresetsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  return onStart;
}

describe('pre-call sheet', () => {
  afterEach(cleanup);
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.setItem('ecallipse.session.user', 'alice');
  });

  it('starts an app call with the default preset in one step', async () => {
    const onStart = renderSheet('bob', true);
    expect(await screen.findByText(/바로 수신 화면이 뜬다/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', {name: 'Call Bob'}));

    expect(onStart).toHaveBeenCalledTimes(1);
    const {route, setup} = onStart.mock.calls[0][0];
    expect(route).toBe('app');
    expect(setup.presetId).toBe('work-call');
    expect(setup.layout.length).toBeGreaterThan(0);
  });

  it('still allows calling an offline user and explains that a push is sent', async () => {
    renderSheet('bob', false);
    expect(await screen.findByText(/푸시 알림/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Call Bob'})).toBeEnabled();
  });

  it('lets the user choose between app and phone when a contact has both', async () => {
    const onStart = renderSheet('mina', false);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('radio', {name: /Phone/}));
    expect(screen.getByText(/더미 전화망/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Call Mina'}));
    expect(onStart.mock.calls[0][0].route).toBe('phone');
  });

  it('offers only the phone route for a phone-only contact', async () => {
    renderSheet('seoul-dental', undefined);
    expect(await screen.findByText(/더미 전화망/)).toBeInTheDocument();
    expect(screen.queryByRole('radio', {name: /App/})).not.toBeInTheDocument();
  });

  it('carries the goal and prepared checklist into the call setup', async () => {
    const onStart = renderSheet('bob', true);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Call goal'), '견적 범위 확정');
    await user.type(screen.getByLabelText('Checklist items'), '예산 확인{Enter}일정 확인');
    await user.click(screen.getByRole('button', {name: 'Call Bob'}));

    expect(onStart.mock.calls[0][0].setup).toMatchObject({goal: '견적 범위 확정', checklist: ['예산 확인', '일정 확인']});
  });

  it('does not ask for a checklist when the chosen preset has none', async () => {
    renderSheet('bob', true);
    await userEvent.setup().click(await screen.findByRole('radio', {name: /가볍게/}));
    expect(screen.queryByLabelText('Checklist items')).not.toBeInTheDocument();
    expect(screen.getByText(/AI 데이터를 쓰지 않는다/)).toBeInTheDocument();
  });
});
