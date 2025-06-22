import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../FileUpload';

describe('FileUpload', () => {
  it('renders the upload label and input', () => {
    render(<FileUpload onFileUpload={jest.fn()} />);
    expect(screen.getByText(/upload an image/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/click to upload/i)).toBeInTheDocument();
  });

  it('shows error for invalid file type', async () => {
    render(<FileUpload onFileUpload={jest.fn()} acceptedFileTypes="image/png" />);
    const input = screen.getByLabelText(/click to upload/i);
    const file = new File(['dummy'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/invalid file type/i)).toBeInTheDocument());
  });

  it('calls onFileUpload for valid image', async () => {
    const mockUpload = jest.fn();
    render(<FileUpload onFileUpload={mockUpload} acceptedFileTypes="image/png" />);
    const input = screen.getByLabelText(/click to upload/i);
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    // FileReader is async, so we wait for the callback
    await waitFor(() => expect(mockUpload).toHaveBeenCalled());
  });
});