import fs from 'fs';
import crypto from 'crypto';
import path from 'path';

// ── Allowed upload constraints ──────────────────────────────────────
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_FILE_COUNT = 5;

// ── Magic-byte signatures for supported image formats ───────────────
const IMAGE_SIGNATURES = [
  {
    type: 'jpeg',
    ext: '.jpg',
    check: (buf) =>
      buf.length >= 3 &&
      buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF,
  },
  {
    type: 'png',
    ext: '.png',
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A,
  },
  {
    type: 'webp',
    ext: '.webp',
    check: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50, // WEBP
  },
];

/**
 * Detect image type by reading magic bytes from a file on disk.
 * @param {string} filePath — absolute path to the file
 * @returns {{ type: string, ext: string } | null} detected type, or null
 */
export function detectImageType(filePath) {
  const buffer = Buffer.alloc(12);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    if (bytesRead === 0) return null; // empty file
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }

  for (const sig of IMAGE_SIGNATURES) {
    if (sig.check(buffer)) {
      return { type: sig.type, ext: sig.ext };
    }
  }
  return null;
}

/**
 * Remove uploaded files from disk (best-effort).
 * Accepts Multer file objects (with .path) or plain path strings.
 * @param {Array<{ path: string } | string>} files
 */
export function cleanupFiles(files) {
  for (const file of files) {
    const filePath = typeof file === 'string' ? file : file.path;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}

/**
 * Generate a safe filename using crypto.randomUUID and a detected extension.
 * @param {string} detectedExt — e.g. '.jpg', '.png', '.webp'
 * @returns {string}
 */
export function generateSafeFilename(detectedExt) {
  return `product-${crypto.randomUUID()}${detectedExt}`;
}

/**
 * Validate magic bytes of ALL uploaded files and rename from .tmp to the
 * extension determined by the detected image type.
 *
 * All-or-nothing: if ANY file fails validation, ALL files from this request
 * are deleted and an error is returned.
 *
 * @param {Array} files — Multer file objects (with .path, .filename)
 * @param {string} uploadsDir — directory where files are stored
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAndFinalizeUploads(files, uploadsDir) {
  const detectedTypes = [];

  // Phase 1: validate every file's magic bytes
  for (const file of files) {
    // Reject empty / zero-byte files
    try {
      const stat = fs.statSync(file.path);
      if (stat.size === 0) {
        cleanupFiles(files);
        return { valid: false, error: 'Uploaded file is empty.' };
      }
    } catch {
      cleanupFiles(files);
      return { valid: false, error: 'Failed to read uploaded file.' };
    }

    const detected = detectImageType(file.path);
    if (!detected) {
      cleanupFiles(files);
      return {
        valid: false,
        error: 'Uploaded file is not a valid image. Only JPG, PNG, and WebP are accepted.',
      };
    }
    detectedTypes.push(detected);
  }

  // Phase 2: rename every .tmp file to its detected extension
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const detected = detectedTypes[i];
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const newFilename = `${baseName}${detected.ext}`;
    const newPath = path.join(uploadsDir, newFilename);

    try {
      fs.renameSync(file.path, newPath);
      file.path = newPath;
      file.filename = newFilename;
    } catch {
      // Rename failed — clean up already-renamed files and remaining .tmp files
      for (let j = 0; j < i; j++) {
        cleanupFiles([files[j]]);
      }
      for (let j = i; j < files.length; j++) {
        cleanupFiles([files[j]]);
      }
      return { valid: false, error: 'Failed to process uploaded image.' };
    }
  }

  return { valid: true };
}
