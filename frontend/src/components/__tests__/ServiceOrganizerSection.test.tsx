import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceOrganizerSection from '../ServiceOrganizerSection';

describe('ServiceOrganizerSection', () => {
  it('renders form fields and allows input', () => {
    render(
      <ServiceOrganizerSection userProfile={null} onAddTask={jest.fn()} />
    );
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/details/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/details/i), { target: { value: 'Test details' } });
    expect(screen.getByLabelText(/details/i)).toHaveValue('Test details');
  });

  it('shows error if AI draft requested without API key', async () => {
    render(
      <ServiceOrganizerSection userProfile={null} onAddTask={jest.fn()} />
    );
    fireEvent.click(screen.getByText(/generate ai draft/i));
    expect(await screen.findByText(/api key not configured/i)).toBeInTheDocument();
  });
});
