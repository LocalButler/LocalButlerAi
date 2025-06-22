import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FridgeAnalyzerSection from '../FridgeAnalyzerSection';

describe('FridgeAnalyzerSection', () => {
  const baseProps = {
    userProfile: null,
    onAddTask: jest.fn(),
    kitchenInventory: [],
    onUpdateKitchenInventory: jest.fn(),
  };

  it('renders the fridge analyzer title and upload', () => {
    render(<FridgeAnalyzerSection {...baseProps} />);
    expect(screen.getByText(/fridge analyzer/i)).toBeInTheDocument();
    expect(screen.getByText(/upload fridge photo/i)).toBeInTheDocument();
  });

  it('allows entering a custom prompt', () => {
    render(<FridgeAnalyzerSection {...baseProps} />);
    const textarea = screen.getByPlaceholderText(/what should i look for or suggest/i);
    fireEvent.change(textarea, { target: { value: 'Suggest vegan meals' } });
    expect(textarea).toHaveValue('Suggest vegan meals');
  });
});
