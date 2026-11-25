import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('renders the overview screen and navigation', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation', { name: 'Primary' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });

  it('switches and reflects the display currency', async () => {
    const user = userEvent.setup();
    render(<App />);

    const group = screen.getAllByRole('group', { name: 'Display currency' })[0];
    expect(group).toBeDefined();
    const tryButton = within(group as HTMLElement).getByRole('button', { name: 'TRY' });
    await user.click(tryButton);

    expect(tryButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes to settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    const [settingsLink] = screen.getAllByRole('link', { name: 'Settings' });
    expect(settingsLink).toBeDefined();
    await user.click(settingsLink as HTMLElement);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});
