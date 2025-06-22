import React from 'react';
import { render, screen } from '@testing-library/react';
import SectionContainer from '../SectionContainer';

describe('SectionContainer', () => {
  it('renders the section container title', () => {
    render(<SectionContainer title="Test Title" icon={<span>Icon</span>}>Content</SectionContainer>);
    expect(screen.getByText(/test title/i)).toBeInTheDocument();
  });
});
