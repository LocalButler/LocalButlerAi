import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsSection from '../SettingsSection';

describe('SettingsSection', () => {
  it('renders the settings section title', () => {
    render(<SettingsSection />);
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });
});
