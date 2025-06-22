import React from 'react';
import { render } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Placeholder for future test variables/types

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('renders with custom size', () => {
    const { container } = render(<LoadingSpinner size="w-4 h-4" />);
    expect(container.firstChild).toHaveClass('w-4', 'h-4');
  });
});
