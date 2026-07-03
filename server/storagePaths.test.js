import { describe, it, expect, vi } from 'vitest';
import { resolveStoragePaths, validateStoragePaths, isRender } from './storagePaths.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Storage Paths', () => {
  describe('resolveStoragePaths', () => {
    it('should resolve local default paths when DATA_DIR is not set', () => {
      const paths = resolveStoragePaths({ NODE_ENV: 'development' });
      expect(paths.databasePath).toBe(path.join(__dirname, 'database.sqlite'));
      expect(paths.uploadsDir).toBe(path.join(__dirname, 'uploads'));
    });

    it('should resolve test DB path when NODE_ENV is test', () => {
      const paths = resolveStoragePaths({ NODE_ENV: 'test' });
      expect(paths.databasePath).toBe(path.join(__dirname, 'test-database.sqlite'));
      expect(paths.uploadsDir).toBe(path.join(__dirname, 'uploads'));
    });

    it('should resolve test DB path when NODE_ENV is test even if DATA_DIR is set', () => {
      const paths = resolveStoragePaths({ NODE_ENV: 'test', DATA_DIR: '/var/data' });
      expect(paths.databasePath).toBe(path.join(__dirname, 'test-database.sqlite'));
      expect(paths.uploadsDir).toBe(path.join(__dirname, 'uploads'));
    });

    it('should resolve paths relative to DATA_DIR when set', () => {
      const paths = resolveStoragePaths({ NODE_ENV: 'production', DATA_DIR: '/var/data' });
      expect(paths.databasePath).toBe(path.join('/var/data', 'database.sqlite'));
      expect(paths.uploadsDir).toBe(path.join('/var/data', 'uploads'));
    });
  });

  describe('isRender', () => {
    it('detects RENDER=true', () => {
      expect(isRender({ RENDER: 'true' })).toBe(true);
    });
    it('detects RENDER_SERVICE_ID', () => {
      expect(isRender({ RENDER_SERVICE_ID: 'srv-123' })).toBe(true);
    });
    it('detects RENDER_EXTERNAL_URL', () => {
      expect(isRender({ RENDER_EXTERNAL_URL: 'https://app.onrender.com' })).toBe(true);
    });
    it('returns false for local', () => {
      expect(isRender({ NODE_ENV: 'production' })).toBe(false);
    });
  });

  describe('validateStoragePaths', () => {
    it('does not throw in development', () => {
      expect(() => validateStoragePaths({ NODE_ENV: 'development', RENDER: 'true' })).not.toThrow();
    });

    it('does not throw in production not on Render', () => {
      expect(() => validateStoragePaths({ NODE_ENV: 'production' })).not.toThrow();
    });

    it('throws if on Render in production and DATA_DIR is missing and ALLOW_EPHEMERAL_STORAGE is not true', () => {
      expect(() => validateStoragePaths({ NODE_ENV: 'production', RENDER: 'true' }))
        .toThrow(/DATA_DIR environment variable is missing on Render in production/);
    });

    it('warns but does not throw if on Render in production, DATA_DIR is missing, and ALLOW_EPHEMERAL_STORAGE is true', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => validateStoragePaths({ NODE_ENV: 'production', RENDER: 'true', ALLOW_EPHEMERAL_STORAGE: 'true' }))
        .not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Running on Render with ephemeral storage'));
      consoleWarnSpy.mockRestore();
    });

    it('throws if DATA_DIR resolves inside the app directory on Render', () => {
      const unsafeDataDir = path.join(__dirname, '..', 'data');
      expect(() => validateStoragePaths({ NODE_ENV: 'production', RENDER: 'true', DATA_DIR: unsafeDataDir }))
        .toThrow(/inside the ephemeral app directory/);
    });

    it('throws if DATA_DIR resolves inside the app directory on Render even if ALLOW_EPHEMERAL_STORAGE is true', () => {
      const unsafeDataDir = path.join(__dirname, '..', 'data');
      expect(() => validateStoragePaths({ NODE_ENV: 'production', RENDER: 'true', DATA_DIR: unsafeDataDir, ALLOW_EPHEMERAL_STORAGE: 'true' }))
        .toThrow(/inside the ephemeral app directory/);
    });

    it('does not throw if DATA_DIR is safe on Render', () => {
      expect(() => validateStoragePaths({ NODE_ENV: 'production', RENDER: 'true', DATA_DIR: '/var/data' }))
        .not.toThrow();
    });
  });
});
