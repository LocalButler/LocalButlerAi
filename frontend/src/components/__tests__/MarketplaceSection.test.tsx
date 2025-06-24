import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketplaceSection from '../MarketplaceSection';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Placeholder for future test variables/types

const mockTasks = [
  {
    id: '1',
    title: 'Walk my dog',
    description: 'Take my dog for a 30-minute walk.',
    status: 'OPEN_FOR_OFFERS',
    bounty: 10,
    createdAt: new Date().toISOString(),
    sourceSection: 'Services',
  },
  {
    id: '2',
    title: 'Grocery pickup',
    description: 'Pick up groceries from the store.',
    status: 'CLOSED',
    bounty: 5,
    createdAt: new Date().toISOString(),
    sourceSection: 'Errands',
  },
];

describe('MarketplaceSection', () => {
  it('renders open tasks', () => {
    render(<MarketplaceSection tasks={mockTasks} onUpdateTask={jest.fn()} />);
    expect(screen.getByText(/walk my dog/i)).toBeInTheDocument();
    expect(screen.queryByText(/grocery pickup/i)).not.toBeInTheDocument();
  });

  it('shows empty message if no open tasks', () => {
    render(<MarketplaceSection tasks={[]} onUpdateTask={jest.fn()} />);
    expect(screen.getByText(/no tasks are currently open/i)).toBeInTheDocument();
  });

  it('expands a task and opens bid modal', () => {
    render(<MarketplaceSection tasks={mockTasks} onUpdateTask={jest.fn()} />);
    fireEvent.click(screen.getByText(/walk my dog/i));
    expect(screen.getByText(/take my dog for a 30-minute walk/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/accept & place bid/i));
    expect(screen.getByText(/place bid for/i)).toBeInTheDocument();
  });
});
