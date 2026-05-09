import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../wailsjs/go/main/App', () => ({
  LogToBackend: vi.fn().mockResolvedValue(undefined),
}));

import { logger } from './logger';
import { LogToBackend } from '../../wailsjs/go/main/App';

const mockLogToBackend = LogToBackend as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockLogToBackend.mockClear();
});

describe('logger façade', () => {
  it('logger.error(Error) attaches stack and uses Error.message', () => {
    const err = new Error('boom');
    logger.error('fallback msg', err);
    expect(mockLogToBackend).toHaveBeenCalledWith({
      Level: 'error',
      Source: 'frontend',
      Msg: 'boom',
      Stack: expect.stringContaining('Error'),
    });
  });

  it('logger.warn(msg, fields) serialises fields as key=value sorted', () => {
    logger.warn('refresh failed', { project: 'demo', err: 'no project' });
    const call = mockLogToBackend.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    expect(call?.Level).toBe('warn');
    // Sorted keys: err < project
    expect(call?.Msg).toBe('refresh failed err="no project" project=demo');
  });

  it('logger.info without fields sends bare message', () => {
    logger.info('startup');
    expect(mockLogToBackend).toHaveBeenCalledWith({
      Level: 'info',
      Source: 'frontend',
      Msg: 'startup',
      Stack: '',
    });
  });

  it('logger.error(msg, fields) without Error sends as plain message', () => {
    logger.error('dispatch failed', { action: 'open' });
    expect(mockLogToBackend).toHaveBeenCalledWith({
      Level: 'error',
      Source: 'frontend',
      Msg: 'dispatch failed action=open',
      Stack: '',
    });
  });

  it('binding throw does not propagate', () => {
    mockLogToBackend.mockImplementationOnce(() => {
      throw new Error('wails not ready');
    });
    expect(() => logger.warn('still ok')).not.toThrow();
  });
});
