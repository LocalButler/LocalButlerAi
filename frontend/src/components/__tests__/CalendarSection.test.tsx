import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarSection from '../CalendarSection';

describe('CalendarSection', () => {
  it('renders the calendar section title', () => {
    render(<CalendarSection />);
    expect(screen.getByText(/my calendar/i)).toBeInTheDocument();
  });
  it('shows under development message', () => {
    render(<CalendarSection />);
    expect(screen.getByText(/this section is under development/i)).toBeInTheDocument();
  });
});
