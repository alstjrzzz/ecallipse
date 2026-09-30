import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it} from 'vitest';
import {LandingPage} from './LandingPage';

describe('LandingPage', () => {
  it('introduces the configurable call workflow', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByRole('heading', {name: /Make every conversation actionable/i})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Start a workspace'})).toHaveAttribute('href', '/signup');
    expect(screen.getByText('Shape the workspace')).toBeInTheDocument();
  });
});
