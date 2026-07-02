import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveStoragePaths(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  
  let databasePath;
  let uploadsDir;

  if (env.DATA_DIR) {
    databasePath = path.join(env.DATA_DIR, 'database.sqlite');
    uploadsDir = path.join(env.DATA_DIR, 'uploads');
  } else {
    databasePath = path.join(__dirname, isTest ? 'test-database.sqlite' : 'database.sqlite');
    uploadsDir = path.join(__dirname, 'uploads');
  }

  return { databasePath, uploadsDir };
}

export function isRender(env = process.env) {
  return env.RENDER === 'true' || !!env.RENDER_SERVICE_ID || !!env.RENDER_EXTERNAL_URL;
}

export function validateStoragePaths(env = process.env) {
  const isProd = env.NODE_ENV === 'production';
  
  if (isProd && isRender(env)) {
    if (!env.DATA_DIR) {
      if (env.ALLOW_EPHEMERAL_STORAGE === 'true') {
        console.warn('WARNING: Running on Render with ephemeral storage (ALLOW_EPHEMERAL_STORAGE=true). SQLite database and uploaded images will be lost on redeploy/restart!');
        return;
      }
      throw new Error('FATAL: DATA_DIR environment variable is missing on Render in production. This will lead to data loss.');
    }
    
    // Check if DATA_DIR resolves to the ephemeral project source path (e.g. /opt/render/project/src)
    const resolvedDataDir = path.resolve(env.DATA_DIR);
    const resolvedAppDir = path.resolve(path.join(__dirname, '..'));
    
    if (resolvedDataDir.startsWith(resolvedAppDir)) {
      throw new Error(`FATAL: DATA_DIR (${resolvedDataDir}) is inside the ephemeral app directory on Render. This will lead to data loss.`);
    }
  }
}

export function ensureStorageDirectories(paths) {
  if (!fs.existsSync(paths.uploadsDir)) {
    fs.mkdirSync(paths.uploadsDir, { recursive: true });
  }
}

export function logStoragePaths(paths) {
  console.log(`Database Path: ${paths.databasePath}`);
  console.log(`Uploads Directory: ${paths.uploadsDir}`);
}
