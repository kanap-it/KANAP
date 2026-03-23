import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatInput from '../components/ChatInput';

describe('ChatInput', () => {
  it('submits trimmed text and clears the field', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Ask Plaid...');
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: '  hello plaid  ' } });
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('hello plaid');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not submit when disabled', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);

    const input = screen.getByPlaceholderText('Ask Plaid...');
    const sendButton = screen.getByRole('button');

    expect(sendButton).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.click(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });
});
