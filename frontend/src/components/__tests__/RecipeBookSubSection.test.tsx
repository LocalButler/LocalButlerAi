import React from 'react';
import { render } from '@testing-library/react';
import RecipeBookSubSection_DEPRECATED from '../RecipeBookSubSection';

describe('RecipeBookSubSection_DEPRECATED', () => {
  it('renders deprecation message', () => {
    const { getByText } = render(<RecipeBookSubSection_DEPRECATED />);
    expect(getByText(/functionality has moved/i)).toBeInTheDocument();
  });
});
