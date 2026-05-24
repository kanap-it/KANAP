import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import ChatInput from '../components/ChatInput';
import { createAppTheme } from '../../config/ThemeContext';

describe('ChatInput', () => {
  const theme = createAppTheme('light');
  const renderWithTheme = (ui: React.ReactElement) => render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>,
  );

  it('submits trimmed text and clears the field', () => {
    const onSend = vi.fn();
    renderWithTheme(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText(/Ask Plaid/);
    const sendButton = screen.getByRole('button');

    fireEvent.change(input, { target: { value: '  hello plaid  ' } });
    fireEvent.click(sendButton);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('hello plaid');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not submit when disabled', () => {
    const onSend = vi.fn();
    renderWithTheme(<ChatInput onSend={onSend} disabled />);

    const input = screen.getByPlaceholderText(/Ask Plaid/);
    const sendButton = screen.getByRole('button');

    expect(sendButton).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    fireEvent.click(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });
});
