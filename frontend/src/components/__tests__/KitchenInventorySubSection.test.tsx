// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Placeholder for future test variables/types

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KitchenInventorySubSection from '../KitchenInventorySubSection';

const mockInventory = [
  { id: '1', name: 'Eggs', quantity: '12' },
  { id: '2', name: 'Milk', quantity: '1L' },
];
const mockUserProfile = { id: 'user1', name: 'Test User' };

describe('KitchenInventorySubSection', () => {
  it('renders inventory items', () => {
    render(
      <KitchenInventorySubSection
        inventory={mockInventory}
        onUpdateInventory={jest.fn()}
        userProfile={mockUserProfile}
      />
    );
    expect(screen.getByText(/eggs/i)).toBeInTheDocument();
    expect(screen.getByText(/milk/i)).toBeInTheDocument();
  });

  it('can add a new item', () => {
    const onUpdateInventory = jest.fn();
    render(
      <KitchenInventorySubSection
        inventory={mockInventory}
        onUpdateInventory={onUpdateInventory}
        userProfile={mockUserProfile}
      />
    );
    fireEvent.change(screen.getByLabelText(/new inventory item name/i), { target: { value: 'Flour' } });
    fireEvent.change(screen.getByLabelText(/new inventory item quantity/i), { target: { value: '2kg' } });
    fireEvent.click(screen.getByLabelText(/add item to inventory/i));
    expect(onUpdateInventory).toHaveBeenCalled();
  });

  it('can start editing and remove an item', () => {
    const onUpdateInventory = jest.fn();
    render(
      <KitchenInventorySubSection
        inventory={mockInventory}
        onUpdateInventory={onUpdateInventory}
        userProfile={mockUserProfile}
      />
    );
    fireEvent.click(screen.getAllByLabelText(/edit item/i)[0]);
    fireEvent.change(screen.getByLabelText(/edit item name/i), { target: { value: 'Eggs Large' } });
    fireEvent.change(screen.getByLabelText(/edit item quantity/i), { target: { value: '18' } });
    fireEvent.click(screen.getByLabelText(/save edit/i));
    expect(onUpdateInventory).toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText(/remove item/i)[0]);
    expect(onUpdateInventory).toHaveBeenCalled();
  });
});
