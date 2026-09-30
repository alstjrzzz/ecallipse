import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {beforeEach, describe, expect, it} from 'vitest';
import {AuthProvider} from './AuthContext';
import {AuthPage} from '../pages/AuthPage';

describe('dummy authentication', () => {
  beforeEach(() => sessionStorage.clear());

  it('keeps the selected identity in the current browser tab', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/app" element={<h1>Workspace ready</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByText('Bob Lee'));
    await user.click(screen.getByRole('button', {name: 'Continue to workspace'}));

    expect(screen.getByRole('heading', {name: 'Workspace ready'})).toBeInTheDocument();
    expect(sessionStorage.getItem('ecallipse.session.user')).toBe('bob');
  });
});
