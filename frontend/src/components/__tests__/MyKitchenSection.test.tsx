import React from 'react';
import { render } from '@testing-library/react';
import MyKitchenSection from '../MyKitchenSection';

describe('MyKitchenSection', () => {
  it('renders the kitchen hub section', () => {
    render(
      <MyKitchenSection
        userProfile={null}
        onAddTask={jest.fn()}
        kitchenInventoryGlobal={[]}
        onUpdateKitchenInventoryGlobal={jest.fn()}
      />
    );
    expect(document.body.textContent).toMatch(/my kitchen hub/i);
    expect(document.body.textContent).toMatch(/fridge analysis/i);
    expect(document.body.textContent).toMatch(/inventory management/i);
  });
});
