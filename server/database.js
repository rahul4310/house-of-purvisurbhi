import initSqlJs from 'sql.js';
import fs from 'fs';
import { resolveStoragePaths } from './storagePaths.js';
const { databasePath: DB_PATH } = resolveStoragePaths();

let db;

/**
 * Initialize the SQLite database via sql.js.
 * Loads an existing file from disk or creates a fresh in-memory DB.
 * Creates tables and seeds initial products if the table is empty.
 */
export async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database file or create a new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      image_url TEXT,
      additional_images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 1,
      available INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 1'); } catch (e) {}
  try { db.run('ALTER TABLE products ADD COLUMN active INTEGER DEFAULT 1'); } catch (e) {}
  try { db.run("ALTER TABLE products ADD COLUMN additional_images TEXT DEFAULT '[]'"); } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT,
      product_price INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      customer_address TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      payment_status TEXT DEFAULT 'pending',
      payment_mode TEXT,
      payment_reference TEXT,
      tracking_details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try { db.run('ALTER TABLE orders ADD COLUMN payment_reference TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE orders ADD COLUMN tracking_details TEXT'); } catch (e) {}
  try { db.run("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'"); } catch (e) {}
  try { db.run('ALTER TABLE orders ADD COLUMN payment_mode TEXT'); } catch (e) {}

  // Seed initial products if the table is empty
  const countResult = db.exec('SELECT COUNT(*) FROM products');
  const count = countResult[0]?.values[0][0] || 0;

  if (count === 0) {
    const seedProducts = [
      {
        name: 'Crimson Red Banarasi Silk Saree',
        category: 'saree',
        price: 12999,
        stock: 5,
        description: 'A stunning crimson red Banarasi silk saree with intricate gold zari work. Perfect for weddings and festive occasions.',
        image_url: '/images/saree_product_1_1782536838378.png',
      },
      {
        name: 'Pastel Peach Organza Saree',
        category: 'saree',
        price: 8499,
        stock: 3,
        description: 'A modern, elegant pastel peach organza saree with delicate floral embroidery. Ideal for parties and celebrations.',
        image_url: '/images/saree_product_2_1782536870654.png',
      },
      {
        name: 'Emerald Green Anarkali Suit',
        category: 'suit',
        price: 9999,
        stock: 2,
        description: 'An elegant emerald green Anarkali suit with intricate embroidery work. A timeless piece for any special occasion.',
        image_url: '/images/suit_product_1_1782536849504.png',
      },
      {
        name: 'Navy Blue Palazzo Suit',
        category: 'suit',
        price: 7499,
        stock: 4,
        description: 'A chic navy blue Palazzo suit set with silver embellishments. Perfect for a modern ethnic look.',
        image_url: '/images/suit_product_2_1782536881318.png',
      },
    ];

    const insertSql = `
      INSERT INTO products (name, category, price, stock, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const p of seedProducts) {
      db.run(insertSql, [p.name, p.category, p.price, p.stock, p.description, p.image_url]);
    }

    console.log('Database seeded with 4 initial products.');
  }

  saveDatabase();
  console.log('Database initialized successfully.');
  return db;
}

/**
 * Get the current database instance.
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Persist the in-memory database to disk.
 * Must be called after every INSERT / UPDATE / DELETE.
 */
export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Helper: run a parameterized SELECT and return an array of row objects.
 * Example: queryAll("SELECT * FROM products WHERE category = ?", ["saree"])
 */
export function queryAll(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: run a parameterized SELECT and return the first row object, or null.
 */
export function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run an INSERT / UPDATE / DELETE with params and save to disk.
 * Returns { changes, lastId } where lastId is the last inserted rowid.
 */
export function runSql(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  const info = d.exec('SELECT changes() AS changes, last_insert_rowid() AS lastId');
  saveDatabase();
  const changes = info[0]?.values[0][0] || 0;
  const lastId = info[0]?.values[0][1] || 0;
  return { changes, lastId };
}
