import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ToolResultRenderer from '../components/ToolResultRenderer';

describe('ToolResultRenderer', () => {
  it('renders search payloads', () => {
    render(
      <ToolResultRenderer
        name="search_all"
        arguments={{ query: 'crm' }}
        result={{
          items: [
            {
              id: 'app-1',
              type: 'applications',
              ref: 'APP-1',
              label: 'CRM',
              status: 'active',
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByText('search all'));

    expect(screen.getByText('APP-1')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders document payloads', () => {
    render(
      <ToolResultRenderer
        name="get_document"
        result={{
          ref: 'DOC-7',
          title: 'Runbook',
          summary: 'Keep it updated.',
        }}
      />,
    );

    fireEvent.click(screen.getByText('get document'));

    expect(screen.getByText('DOC-7: Runbook')).toBeInTheDocument();
    expect(screen.getByText('Keep it updated.')).toBeInTheDocument();
  });

  it('falls back to generic JSON rendering for unknown payloads', () => {
    render(
      <ToolResultRenderer
        name="custom_tool"
        result={{
          ok: true,
          nested: { count: 2 },
        }}
      />,
    );

    fireEvent.click(screen.getByText('custom tool'));

    expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
    expect(screen.getByText(/"count": 2/)).toBeInTheDocument();
  });
});
