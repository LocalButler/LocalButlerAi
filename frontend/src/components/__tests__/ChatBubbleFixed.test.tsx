import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatBubble from '../ChatBubbleFixed';

describe('ChatBubble', () => {
  it('renders the floating chat button', () => {
    render(<ChatBubble />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens and closes the chat window', () => {
    render(<ChatBubble />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText(/AI Butler/i)).toBeInTheDocument();
    // Close chat
    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[2]); // The close (X) button
    expect(screen.queryByText(/AI Butler/i)).not.toBeInTheDocument();
  });

  it('allows typing in the input and sending a message', async () => {
    render(<ChatBubble />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    const input = screen.getByPlaceholderText(/type your message/i);
    fireEvent.change(input, { target: { value: 'Hello Butler' } });
    expect(input).toHaveValue('Hello Butler');
    const sendButton = screen.getAllByRole('button').find(btn => btn.innerHTML.includes('svg'));
    fireEvent.click(sendButton!);
    await waitFor(() => expect(input).toHaveValue(''));
  });
});
