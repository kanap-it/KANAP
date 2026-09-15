import { describe, expect, it } from 'vitest';
import { insertAtCaret } from './agentPersona';

describe('insertAtCaret', () => {
  it('inserts into an empty field without padding', () => {
    expect(insertAtCaret('', 0, 0, 'Support N1')).toEqual({ text: 'Support N1', caret: 10 });
  });

  it('pads both sides in the middle of a word', () => {
    const result = insertAtCaret('routeto', 5, 5, 'Support N1');
    expect(result.text).toBe('route Support N1 to');
    expect(result.text.slice(0, result.caret)).toBe('route Support N1 ');
  });

  it('adds only a leading space at the end of the text', () => {
    const result = insertAtCaret('Route to', 8, 8, 'Support N1');
    expect(result).toEqual({ text: 'Route to Support N1', caret: 19 });
  });

  it('keeps existing spaces instead of doubling them', () => {
    const result = insertAtCaret('Route to  next', 9, 9, 'Support N1');
    expect(result.text).toBe('Route to Support N1 next');
  });

  it('replaces the current selection', () => {
    const result = insertAtCaret('Route to Team A', 9, 15, 'Team B');
    expect(result).toEqual({ text: 'Route to Team B', caret: 15 });
  });

  it('clamps out-of-range positions to the text length', () => {
    const result = insertAtCaret('Route', 99, 120, 'Team B');
    expect(result.text).toBe('Route Team B');
  });
});
