import { describe, it, expect, vi } from 'vitest';
import { DefaultLogger } from '../../src/services/logging/Logger';

describe('DefaultLogger', () => {
  it('calls console methods for info/warn/error', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new DefaultLogger();
    logger.info('hello', { a: 1 });
    logger.info('no meta');
    logger.warn('be careful');
    logger.warn('with meta', { w: 1 });
    logger.error('oops');
    logger.error('with meta', { e: true });
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});