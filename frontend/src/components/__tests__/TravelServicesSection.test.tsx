import React from 'react';
import { render, screen } from '@testing-library/react';
import TravelServicesSection from '../TravelServicesSection';

describe('TravelServicesSection', () => {
  it('renders the travel concierge section title', () => {
    render(
      <TravelServicesSection userProfile={null} onAddTask={() => {}} />
    );
    expect(screen.getByText(/travel concierge/i)).toBeInTheDocument();
  });
});
