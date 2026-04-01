import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const JWT_SECRET = 'super-secret-jwt-key-for-testing';
const PORT = 3000;

// Initialize Database
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    storeName TEXT,
    storeDescription TEXT,
    profileImage TEXT,
    coverImage TEXT,
    lastShippingDetails TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    vendorId TEXT,
    vendorName TEXT,
    name TEXT,
    description TEXT,
    price REAL,
    currency TEXT DEFAULT 'USD',
    category TEXT,
    imageUrl TEXT,
    stock INTEGER,
    tags TEXT,
    isHalalCertified INTEGER,
    availableCountries TEXT,
    availableCities TEXT,
    variations TEXT
  );

  -- Migration: Add currency column if it doesn't exist
  -- Note: SQLite doesn't support 'IF NOT EXISTS' for ADD COLUMN directly in a simple way without a PRAGMA check,
  -- but we can try to add it and catch the error or use a more robust check.
  -- For this environment, we'll use a try-catch block in the JS code instead of raw SQL for the migration.

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    customerName TEXT,
    vendorId TEXT,
    vendorName TEXT,
    status TEXT,
    totalAmount REAL,
    createdAt TEXT,
    shippingDetails TEXT,
    paymentMethod TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT,
    title TEXT,
    message TEXT,
    type TEXT,
    orderId TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    productId TEXT,
    productName TEXT,
    price REAL,
    quantity INTEGER,
    selectedVariations TEXT,
    imageUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS order_history (
    id TEXT PRIMARY KEY,
    orderId TEXT,
    status TEXT,
    description TEXT,
    timestamp TEXT
  );
`);

// Migration: Ensure all required columns exist in the tables
try {
  const requiredColumns = [
    { table: 'products', name: 'currency', type: 'TEXT DEFAULT \'USD\'' },
    { table: 'products', name: 'tags', type: 'TEXT' },
    { table: 'products', name: 'isHalalCertified', type: 'INTEGER DEFAULT 1' },
    { table: 'products', name: 'availableCountries', type: 'TEXT' },
    { table: 'products', name: 'availableCities', type: 'TEXT' },
    { table: 'products', name: 'variations', type: 'TEXT' },
    { table: 'users', name: 'storeName', type: 'TEXT' },
    { table: 'users', name: 'storeDescription', type: 'TEXT' },
    { table: 'users', name: 'profileImage', type: 'TEXT' },
    { table: 'users', name: 'coverImage', type: 'TEXT' },
    { table: 'users', name: 'lastShippingDetails', type: 'TEXT' },
    { table: 'orders', name: 'shippingDetails', type: 'TEXT' },
    { table: 'orders', name: 'paymentMethod', type: 'TEXT' }
  ];

  for (const col of requiredColumns) {
    const tableInfo = db.prepare(`PRAGMA table_info(${col.table})`).all() as any[];
    const columns = tableInfo.map(c => c.name);
    if (!columns.includes(col.name)) {
      db.exec(`ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: Added '${col.name}' column to '${col.table}' table.`);
    }
  }
} catch (error) {
  console.error("Migration error:", error);
}

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(cors());
  app.use(express.json());

  // Middleware to authenticate JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API ROUTES ---

  // Auth
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role, storeName } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const id = uuidv4();
      const stmt = db.prepare('INSERT INTO users (id, name, email, password, role, storeName) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(id, name, email, hashedPassword, role, storeName || null);
      
      const token = jwt.sign({ id, email, role }, JWT_SECRET);
      res.json({ token, user: { id, name, email, role, storeName } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;

    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(req.user.id) as any;
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      if (userWithoutPassword.lastShippingDetails) {
        userWithoutPassword.lastShippingDetails = JSON.parse(userWithoutPassword.lastShippingDetails);
      }
      res.json({ user: userWithoutPassword });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // Users
  app.get('/api/users/vendors', (req, res) => {
    const stmt = db.prepare('SELECT id, name, email, role, storeName, storeDescription, profileImage, coverImage FROM users WHERE role = ?');
    const vendors = stmt.all('vendor');
    res.json(vendors);
  });

  app.put('/api/users/profile', authenticateToken, (req: any, res) => {
    const { storeName, storeDescription, profileImage, coverImage } = req.body;
    const stmt = db.prepare('UPDATE users SET storeName = ?, storeDescription = ?, profileImage = ?, coverImage = ? WHERE id = ?');
    stmt.run(storeName, storeDescription, profileImage, coverImage, req.user.id);
    res.json({ success: true });
    io.emit('vendors_updated');
  });

  // Products
  app.get('/api/products', (req, res) => {
    const stmt = db.prepare('SELECT * FROM products');
    const products = stmt.all().map((p: any) => ({
      ...p,
      isHalalCertified: Boolean(p.isHalalCertified),
      currency: p.currency || 'USD',
      tags: JSON.parse(p.tags || '[]'),
      availableCountries: JSON.parse(p.availableCountries || '[]'),
      availableCities: JSON.parse(p.availableCities || '[]'),
      variations: JSON.parse(p.variations || '[]')
    }));
    res.json(products);
  });

  app.post('/api/products', authenticateToken, (req: any, res) => {
    const p = req.body;
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO products (id, vendorId, vendorName, name, description, price, currency, category, imageUrl, stock, tags, isHalalCertified, availableCountries, availableCities, variations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, req.user.id, p.vendorName, p.name, p.description, p.price, p.currency || 'USD', p.category, p.imageUrl, p.stock,
      JSON.stringify(p.tags || []), p.isHalalCertified ? 1 : 0, JSON.stringify(p.availableCountries || []),
      JSON.stringify(p.availableCities || []), JSON.stringify(p.variations || [])
    );
    res.json({ id });
    io.emit('products_updated');
  });

  app.put('/api/products/:id', authenticateToken, (req: any, res) => {
    const p = req.body;
    const stmt = db.prepare(`
      UPDATE products SET name = ?, description = ?, price = ?, currency = ?, category = ?, imageUrl = ?, stock = ?, tags = ?, isHalalCertified = ?, availableCountries = ?, availableCities = ?, variations = ?
      WHERE id = ? AND vendorId = ?
    `);
    stmt.run(
      p.name, p.description, p.price, p.currency || 'USD', p.category, p.imageUrl, p.stock,
      JSON.stringify(p.tags || []), p.isHalalCertified ? 1 : 0, JSON.stringify(p.availableCountries || []),
      JSON.stringify(p.availableCities || []), JSON.stringify(p.variations || []),
      req.params.id, req.user.id
    );
    res.json({ success: true });
    io.emit('products_updated');
  });

  app.delete('/api/products/:id', authenticateToken, (req: any, res) => {
    const stmt = db.prepare('DELETE FROM products WHERE id = ? AND vendorId = ?');
    stmt.run(req.params.id, req.user.id);
    res.json({ success: true });
    io.emit('products_updated');
  });

  // Orders
  app.get('/api/orders', authenticateToken, (req: any, res) => {
    const stmt = db.prepare('SELECT * FROM orders WHERE customerId = ? OR vendorId = ? ORDER BY createdAt DESC');
    const orders = stmt.all(req.user.id, req.user.id).map((o: any) => {
      const itemsStmt = db.prepare('SELECT * FROM order_items WHERE orderId = ?');
      const items = itemsStmt.all(o.id).map((i: any) => ({
        ...i,
        selectedVariations: JSON.parse(i.selectedVariations || '{}')
      }));
      
      const historyStmt = db.prepare('SELECT * FROM order_history WHERE orderId = ? ORDER BY timestamp DESC');
      const history = historyStmt.all(o.id);

      return {
        ...o,
        shippingDetails: JSON.parse(o.shippingDetails || '{}'),
        items,
        history
      };
    });
    res.json(orders);
  });

  app.post('/api/orders', authenticateToken, (req: any, res) => {
    const { vendorId, vendorName, items, totalAmount, shippingDetails, paymentMethod } = req.body;
    const orderId = uuidv4();
    const createdAt = new Date().toISOString();

    // Insert order
    const stmt = db.prepare(`
      INSERT INTO orders (id, customerId, customerName, vendorId, vendorName, status, totalAmount, createdAt, shippingDetails, paymentMethod)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Get customer name
    const userStmt = db.prepare('SELECT name FROM users WHERE id = ?');
    const customer = userStmt.get(req.user.id) as any;

    stmt.run(
      orderId, req.user.id, customer.name, vendorId, vendorName, 'pending', totalAmount, createdAt,
      JSON.stringify(shippingDetails), paymentMethod
    );

    // Save shipping details for future use
    const updateShippingStmt = db.prepare('UPDATE users SET lastShippingDetails = ? WHERE id = ?');
    updateShippingStmt.run(JSON.stringify(shippingDetails), req.user.id);

    // Insert items
    const itemStmt = db.prepare(`
      INSERT INTO order_items (id, orderId, productId, productName, price, quantity, selectedVariations, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      itemStmt.run(
        uuidv4(), orderId, item.productId, item.productName, item.price, item.quantity,
        JSON.stringify(item.selectedVariations || {}), item.imageUrl
      );
    }

    // Insert initial history
    const historyStmt = db.prepare('INSERT INTO order_history (id, orderId, status, description, timestamp) VALUES (?, ?, ?, ?, ?)');
    historyStmt.run(uuidv4(), orderId, 'pending', 'Order placed successfully', createdAt);

    res.json({ success: true, orderId });
    io.emit('orders_updated');
  });

  app.put('/api/orders/:id/status', authenticateToken, (req: any, res) => {
    const { status, description } = req.body;
    const orderId = req.params.id;
    
    const stmt = db.prepare('UPDATE orders SET status = ? WHERE id = ? AND vendorId = ?');
    const result = stmt.run(status, orderId, req.user.id);
    
    if (result.changes > 0) {
      const historyStmt = db.prepare('INSERT INTO order_history (id, orderId, status, description, timestamp) VALUES (?, ?, ?, ?, ?)');
      const now = new Date().toISOString();
      historyStmt.run(uuidv4(), orderId, status, description || `Order status updated to ${status}`, now);
      
      // Create notification for customer
      const order = db.prepare('SELECT customerId, vendorName FROM orders WHERE id = ?').get(orderId) as any;
      if (order) {
        const notifStmt = db.prepare('INSERT INTO notifications (id, userId, title, message, type, orderId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
        notifStmt.run(
          uuidv4(), 
          order.customerId, 
          'Order Update', 
          `Your order from ${order.vendorName} is now ${status}. ${description || ''}`,
          'order_update',
          orderId,
          now
        );
      }

      res.json({ success: true });
      io.emit('orders_updated');
      io.emit('notifications_updated');
    } else {
      res.status(403).json({ error: 'Not authorized to update this order' });
    }
  });

  app.get('/api/notifications', authenticateToken, (req: any, res: any) => {
    const stmt = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC');
    const notifications = stmt.all(req.user.id);
    res.json(notifications);
  });

  app.put('/api/notifications/:id/read', authenticateToken, (req: any, res: any) => {
    const stmt = db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?');
    stmt.run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Socket.io connection
  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
