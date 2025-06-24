import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DietarySection from '../DietarySection';

describe('DietarySection', () => {
  const baseProps = {
    userProfile: null,
    onAddTask: jest.fn(),
    kitchenInventory: [],
    onUpdateKitchenInventory: jest.fn(),
    onSaveRecipeToBook: jest.fn(),
    onSaveCurrentMealPlan: jest.fn(),
  };

  it('renders the meal planner & recipe hub title', () => {
    render(<DietarySection {...baseProps} />);
    expect(screen.getByText(/meal planner & recipe hub/i)).toBeInTheDocument();
  });

  it('allows selecting dietary preferences and entering custom preference', () => {
    render(<DietarySection {...baseProps} />);
    const select = screen.getByLabelText(/dietary preferences/i);
    fireEvent.change(select, { target: { value: 'Other' } });
    expect(select).toHaveValue('Other');
    const customInput = screen.getByPlaceholderText(/custom dietary preference/i);
    fireEvent.change(customInput, { target: { value: 'Keto' } });
    expect(customInput).toHaveValue('Keto');
  });

  it('allows changing number of days and calories', () => {
    render(<DietarySection {...baseProps} />);
    const daysInput = screen.getByLabelText(/number of days/i);
    fireEvent.change(daysInput, { target: { value: '5' } });
    expect(daysInput).toHaveValue(5);
    const caloriesInput = screen.getByLabelText(/target daily calories/i);
    fireEvent.change(caloriesInput, { target: { value: '1800' } });
    expect(caloriesInput).toHaveValue(1800);
  });
});
