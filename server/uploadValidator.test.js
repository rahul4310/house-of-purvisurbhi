import { describe, it, expect, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  detectImageType,
  cleanupFiles,
  validateAndFinalizeUploads,
  generateSafeFilename,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIMES,
  MAX_FILE_SIZE,
  MAX_FILE_COUNT,
} from './uploadValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a dedicated temp directory inside the project for test files
const TEST_TMP_DIR = path.join(__dirname, '__upload_test_tmp__');

function ensureTmpDir() {
  if (!fs.existsSync(TEST_TMP_DIR)) {
    fs.mkdirSync(TEST_TMP_DIR, { recursive: true });
  }
}

function writeTmpFile(name, data) {
  ensureTmpDir();
  const p = path.join(TEST_TMP_DIR, name);
  fs.writeFileSync(p, data);
  return p;
}

afterAll(() => {
  // Clean up the temp directory
  if (fs.existsSync(TEST_TMP_DIR)) {
    fs.rmSync(TEST_TMP_DIR, { recursive: true, force: true });
  }
});

// ── Constants ───────────────────────────────────────────────────────

describe('Upload validator constants', () => {
  it('ALLOWED_EXTENSIONS contains only jpg, jpeg, png, webp', () => {
    expect(ALLOWED_EXTENSIONS).toEqual(['.jpg', '.jpeg', '.png', '.webp']);
  });

  it('ALLOWED_EXTENSIONS does not include gif', () => {
    expect(ALLOWED_EXTENSIONS).not.toContain('.gif');
  });

  it('ALLOWED_MIMES does not include image/gif', () => {
    expect(ALLOWED_MIMES).not.toContain('image/gif');
  });

  it('MAX_FILE_SIZE is 5 MB', () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
  });

  it('MAX_FILE_COUNT is 5', () => {
    expect(MAX_FILE_COUNT).toBe(5);
  });
});

// ── detectImageType ─────────────────────────────────────────────────

describe('detectImageType', () => {
  it('detects valid JPEG (FF D8 FF)', () => {
    const p = writeTmpFile('valid.jpg', Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00]));
    const result = detectImageType(p);
    expect(result).toEqual({ type: 'jpeg', ext: '.jpg' });
  });

  it('detects valid PNG (89 50 4E 47 …)', () => {
    const p = writeTmpFile('valid.png', Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]));
    const result = detectImageType(p);
    expect(result).toEqual({ type: 'png', ext: '.png' });
  });

  it('detects valid WebP (RIFF…WEBP)', () => {
    // RIFF + 4 size bytes + WEBP
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // size placeholder
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const p = writeTmpFile('valid.webp', buf);
    const result = detectImageType(p);
    expect(result).toEqual({ type: 'webp', ext: '.webp' });
  });

  it('rejects GIF (47 49 46 38)', () => {
    const p = writeTmpFile('sneaky.gif', Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]));
    const result = detectImageType(p);
    expect(result).toBeNull();
  });

  it('rejects random bytes with .jpg extension', () => {
    const p = writeTmpFile('fake.jpg', Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]));
    const result = detectImageType(p);
    expect(result).toBeNull();
  });

  it('rejects an empty file', () => {
    const p = writeTmpFile('empty.jpg', Buffer.alloc(0));
    const result = detectImageType(p);
    expect(result).toBeNull();
  });

  it('rejects a file shorter than signature length', () => {
    const p = writeTmpFile('tiny.jpg', Buffer.from([0xFF]));
    const result = detectImageType(p);
    expect(result).toBeNull();
  });

  it('returns null for non-existent file', () => {
    const result = detectImageType(path.join(TEST_TMP_DIR, 'no-such-file.bin'));
    expect(result).toBeNull();
  });

  it('rejects BMP (42 4D)', () => {
    const p = writeTmpFile('image.bmp', Buffer.from([0x42, 0x4D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    expect(detectImageType(p)).toBeNull();
  });

  it('rejects SVG / XML content', () => {
    const p = writeTmpFile('image.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'));
    expect(detectImageType(p)).toBeNull();
  });
});

// ── cleanupFiles ────────────────────────────────────────────────────

describe('cleanupFiles', () => {
  it('deletes files given as Multer-style objects', () => {
    const p = writeTmpFile('to-delete-1.tmp', Buffer.from('test'));
    cleanupFiles([{ path: p }]);
    expect(fs.existsSync(p)).toBe(false);
  });

  it('deletes files given as plain path strings', () => {
    const p = writeTmpFile('to-delete-2.tmp', Buffer.from('test'));
    cleanupFiles([p]);
    expect(fs.existsSync(p)).toBe(false);
  });

  it('does not throw for non-existent files', () => {
    expect(() => cleanupFiles(['/nonexistent/file.tmp'])).not.toThrow();
  });
});

// ── generateSafeFilename ────────────────────────────────────────────

describe('generateSafeFilename', () => {
  it('produces a filename with the given extension', () => {
    const name = generateSafeFilename('.png');
    expect(name).toMatch(/^product-[0-9a-f-]+\.png$/);
  });

  it('produces unique filenames on successive calls', () => {
    const a = generateSafeFilename('.jpg');
    const b = generateSafeFilename('.jpg');
    expect(a).not.toBe(b);
  });
});

// ── validateAndFinalizeUploads ──────────────────────────────────────

describe('validateAndFinalizeUploads', () => {
  it('accepts and renames a valid JPEG .tmp file', () => {
    ensureTmpDir();
    const tmpName = 'product-test-uuid-1.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(true);
    expect(files[0].filename).toBe('product-test-uuid-1.jpg');
    expect(fs.existsSync(files[0].path)).toBe(true);
    // Clean up
    cleanupFiles(files);
  });

  it('accepts and renames a valid PNG .tmp file', () => {
    ensureTmpDir();
    const tmpName = 'product-test-uuid-2.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(true);
    expect(files[0].filename).toBe('product-test-uuid-2.png');
    cleanupFiles(files);
  });

  it('rejects an invalid file and deletes it', () => {
    ensureTmpDir();
    const tmpName = 'product-test-uuid-3.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.from([0x00, 0x01, 0x02, 0x03]));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not a valid image');
    // File must be deleted
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('rejects empty file and deletes it', () => {
    ensureTmpDir();
    const tmpName = 'product-test-uuid-empty.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.alloc(0));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('rejects GIF and deletes it', () => {
    ensureTmpDir();
    const tmpName = 'product-test-uuid-gif.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(false);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('all-or-nothing: if second file is invalid, both files are deleted', () => {
    ensureTmpDir();
    const validTmpName = 'product-test-aon-valid.tmp';
    const invalidTmpName = 'product-test-aon-invalid.tmp';
    const validPath = writeTmpFile(validTmpName, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]));
    const invalidPath = writeTmpFile(invalidTmpName, Buffer.from([0x00, 0x01, 0x02, 0x03]));

    const files = [
      { path: validPath, filename: validTmpName },
      { path: invalidPath, filename: invalidTmpName },
    ];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(false);
    // BOTH files must be deleted
    expect(fs.existsSync(validPath)).toBe(false);
    expect(fs.existsSync(invalidPath)).toBe(false);
  });

  it('all-or-nothing: if first file is invalid, all files are deleted', () => {
    ensureTmpDir();
    const invalidTmpName = 'product-test-aon2-invalid.tmp';
    const validTmpName = 'product-test-aon2-valid.tmp';
    const invalidPath = writeTmpFile(invalidTmpName, Buffer.from([0xDE, 0xAD]));
    const validPath = writeTmpFile(validTmpName, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

    const files = [
      { path: invalidPath, filename: invalidTmpName },
      { path: validPath, filename: validTmpName },
    ];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(false);
    expect(fs.existsSync(invalidPath)).toBe(false);
    expect(fs.existsSync(validPath)).toBe(false);
  });

  it('derives extension from detected type, not from original filename', () => {
    ensureTmpDir();
    // File has JPEG magic bytes but .tmp extension
    const tmpName = 'product-test-ext-detect.tmp';
    const tmpPath = writeTmpFile(tmpName, Buffer.from([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x10]));
    const files = [{ path: tmpPath, filename: tmpName }];

    const result = validateAndFinalizeUploads(files, TEST_TMP_DIR);
    expect(result.valid).toBe(true);
    // Extension should be .jpg (from detection), not .tmp
    expect(files[0].filename).toMatch(/\.jpg$/);
    expect(files[0].filename).not.toMatch(/\.tmp$/);
    cleanupFiles(files);
  });
});
