import type '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as Icons from '../Icons';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Placeholder for future icon test utilities/types

describe('Icons', () => {
  Object.entries(Icons).forEach(([name, IconComponent]) => {
    it(`renders ${name} without crashing`, () => {
      const { container } = render(<IconComponent className="test-icon" />);
      // Use a type assertion to help TypeScript understand the matcher
      (expect(container.querySelector('svg')) as any).toBeInTheDocument();
    });
  });
});
