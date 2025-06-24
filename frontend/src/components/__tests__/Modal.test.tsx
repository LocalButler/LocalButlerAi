// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Placeholder for future test variables/types

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Modal from '../Modal';

describe('Modal', () => {
  it('does not render when closed', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={jest.fn()} title="Test Modal">Content</Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with title and children when open', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">Modal Content</Modal>
    );
    expect(screen.getByText(/test modal/i)).toBeInTheDocument();
    expect(screen.getByText(/modal content/i)).toBeInTheDocument();
  });

  it('calls onClose when overlay or close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">Content</Modal>
    );
    // Overlay click
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalled();
    // Close button click
    fireEvent.click(screen.getByLabelText(/close modal/i));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders footer if provided', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal" footer={<button>FooterBtn</button>}>
        Content
      </Modal>
    );
    expect(screen.getByText(/footerbtn/i)).toBeInTheDocument();
  });
});
