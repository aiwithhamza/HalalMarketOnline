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
    status TEXT DEFAULT 'active',
    storeName TEXT,
    storeDescription TEXT,
    profileImage TEXT,
    coverImage TEXT,
    lastShippingDetails TEXT,
    wishlist TEXT DEFAULT '[]',
    createdAt TEXT
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
    currency TEXT DEFAULT 'USD',
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

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    receiverId TEXT,
    content TEXT,
    isRead INTEGER DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    userProfileImage TEXT,
    productId TEXT,
    vendorId TEXT,
    rating INTEGER,
    comment TEXT,
    isVerifiedPurchase INTEGER DEFAULT 0,
    createdAt TEXT
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
    { table: 'users', name: 'status', type: 'TEXT DEFAULT \'active\'' },
    { table: 'users', name: 'wishlist', type: 'TEXT DEFAULT \'[]\'' },
    { table: 'users', name: 'createdAt', type: 'TEXT' },
    { table: 'users', name: 'storeName', type: 'TEXT' },
    { table: 'users', name: 'storeDescription', type: 'TEXT' },
    { table: 'users', name: 'profileImage', type: 'TEXT' },
    { table: 'users', name: 'coverImage', type: 'TEXT' },
    { table: 'users', name: 'lastShippingDetails', type: 'TEXT' },
    { table: 'orders', name: 'shippingDetails', type: 'TEXT' },
    { table: 'orders', name: 'paymentMethod', type: 'TEXT' },
    { table: 'reviews', name: 'isVerifiedPurchase', type: 'INTEGER DEFAULT 0' },
    { table: 'order_items', name: 'currency', type: 'TEXT DEFAULT \'USD\'' }
  ];

  for (const col of requiredColumns) {
    const tableInfo = db.prepare(`PRAGMA table_info(${col.table})`).all() as any[];
    const columns = tableInfo.map(c => c.name);
    if (!columns.includes(col.name)) {
      db.exec(`ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Migration: Added '${col.name}' column to '${col.table}' table.`);
    }
  }
  
  // Ensure all existing vendors are active for testing
  db.prepare("UPDATE users SET status = 'active' WHERE role = 'vendor' AND (status = 'pending' OR status IS NULL)").run();
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
      const createdAt = new Date().toISOString();
      const status = role === 'vendor' ? 'active' : 'active'; // Changed to active for testing as requested by user context
      
      const stmt = db.prepare('INSERT INTO users (id, name, email, password, role, status, storeName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      stmt.run(id, name, email, hashedPassword, role, status, storeName || null, createdAt);
      
      const token = jwt.sign({ id, email, role }, JWT_SECRET);
      res.json({ token, user: { id, name, email, role, status, storeName, createdAt } });
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
      if (userWithoutPassword.wishlist) {
        userWithoutPassword.wishlist = JSON.parse(userWithoutPassword.wishlist);
      }
      res.json({ user: userWithoutPassword });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  });

  // Users
  app.get('/api/users/vendors', (req, res) => {
    const stmt = db.prepare(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.storeName, u.storeDescription, u.profileImage, u.coverImage, u.createdAt,
        (SELECT AVG(rating) FROM reviews WHERE vendorId = u.id) as rating,
        (SELECT COUNT(*) FROM reviews WHERE vendorId = u.id) as reviewCount
      FROM users u 
      WHERE u.role = 'vendor' AND (u.status = 'active' OR u.status = 'pending' OR u.status IS NULL)
    `);
    const vendors = stmt.all().map((v: any) => ({
      ...v,
      rating: v.rating || 0,
      reviewCount: v.reviewCount || 0
    }));
    res.json({ vendors });
  });

  app.put('/api/users/wishlist', authenticateToken, (req: any, res) => {
    const { productId } = req.body;
    const user = db.prepare('SELECT wishlist FROM users WHERE id = ?').get(req.user.id) as any;
    let wishlist = JSON.parse(user.wishlist || '[]');
    
    if (wishlist.includes(productId)) {
      wishlist = wishlist.filter((id: string) => id !== productId);
    } else {
      wishlist.push(productId);
    }
    
    db.prepare('UPDATE users SET wishlist = ? WHERE id = ?').run(JSON.stringify(wishlist), req.user.id);
    res.json({ wishlist });
  });

  app.put('/api/users/profile', authenticateToken, (req: any, res) => {
    const { name, email, storeName, storeDescription, profileImage, coverImage } = req.body;
    const stmt = db.prepare('UPDATE users SET name = ?, email = ?, storeName = ?, storeDescription = ?, profileImage = ?, coverImage = ? WHERE id = ?');
    stmt.run(name || '', email || '', storeName || null, storeDescription || null, profileImage || null, coverImage || null, req.user.id);
    res.json({ success: true });
    io.emit('vendors_updated');
  });

  // Admin Routes
  app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    
    const totalSales = db.prepare('SELECT SUM(totalAmount) as total FROM orders WHERE status = ?').get('delivered') as any;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('customer') as any;
    const totalVendors = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('vendor') as any;
    const pendingVendors = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ? AND status = ?').get('vendor', 'pending') as any;
    
    res.json({
      totalRevenue: totalSales.total || 0,
      totalCustomers: totalUsers.count,
      totalVendors: totalVendors.count,
      pendingVendors: pendingVendors.count
    });
  });

  app.get('/api/admin/vendors', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const vendors = db.prepare('SELECT id, name, email, status, storeName, createdAt FROM users WHERE role = ?').all('vendor');
    res.json(vendors);
  });

  app.put('/api/admin/vendors/:id/status', authenticateToken, (req: any, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { status } = req.body;
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
    
    // Notify vendor
    const now = new Date().toISOString();
    db.prepare('INSERT INTO notifications (id, userId, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.params.id, 'Account Status Updated', `Your vendor account status has been updated to ${status}.`, 'account_update', now);
    
    res.json({ success: true });
    io.emit('notifications_updated');
    io.emit('vendors_updated');
  });

  // Products
  app.get('/api/products', (req, res) => {
    const stmt = db.prepare(`
      SELECT 
        p.*,
        (SELECT AVG(rating) FROM reviews WHERE productId = p.id) as rating,
        (SELECT COUNT(*) FROM reviews WHERE productId = p.id) as reviewCount
      FROM products p
    `);
    const products = stmt.all().map((p: any) => ({
      ...p,
      isHalalCertified: Boolean(p.isHalalCertified),
      currency: p.currency || 'USD',
      tags: JSON.parse(p.tags || '[]'),
      availableCountries: JSON.parse(p.availableCountries || '[]'),
      availableCities: JSON.parse(p.availableCities || '[]'),
      variations: JSON.parse(p.variations || '[]'),
      rating: p.rating || 0,
      reviewCount: p.reviewCount || 0
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
      INSERT INTO order_items (id, orderId, productId, productName, price, currency, quantity, selectedVariations, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const item of items) {
      itemStmt.run(
        uuidv4(), orderId, item.productId, item.productName, item.price, item.currency || 'USD', item.quantity,
        JSON.stringify(item.selectedVariations || {}), item.imageUrl
      );
    }

    // Insert initial history
    const historyStmt = db.prepare('INSERT INTO order_history (id, orderId, status, description, timestamp) VALUES (?, ?, ?, ?, ?)');
    historyStmt.run(uuidv4(), orderId, 'pending', 'Order placed successfully', createdAt);

    res.json({ success: true, orderId });
    
    // Notify vendor
    const vendorNotifStmt = db.prepare('INSERT INTO notifications (id, userId, title, message, type, orderId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    vendorNotifStmt.run(
      uuidv4(),
      vendorId,
      'New Order Received',
      `You have received a new order #${orderId.slice(0, 8).toUpperCase()} from ${customer.name}.`,
      'new_order',
      orderId,
      createdAt
    );

    io.emit('orders_updated');
    io.emit('notifications_updated');
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

  // Reviews
  app.get('/api/reviews/product/:id', (req, res) => {
    const stmt = db.prepare('SELECT * FROM reviews WHERE productId = ? ORDER BY createdAt DESC');
    const reviews = stmt.all(req.params.id);
    res.json(reviews);
  });

  app.get('/api/reviews/vendor/:id', (req, res) => {
    const stmt = db.prepare('SELECT * FROM reviews WHERE vendorId = ? ORDER BY createdAt DESC');
    const reviews = stmt.all(req.params.id);
    res.json(reviews);
  });

  app.post('/api/reviews', authenticateToken, (req: any, res) => {
    const { productId, vendorId, rating, comment } = req.body;
    const userId = req.user.id;
    
    // Check if user already reviewed this product or vendor
    if (productId) {
      const existing = db.prepare('SELECT id FROM reviews WHERE userId = ? AND productId = ?').get(userId, productId);
      if (existing) return res.status(400).json({ error: 'You have already reviewed this product' });
    } else if (vendorId) {
      const existing = db.prepare('SELECT id FROM reviews WHERE userId = ? AND vendorId = ?').get(userId, vendorId);
      if (existing) return res.status(400).json({ error: 'You have already reviewed this vendor' });
    }

    // Check if it's a verified purchase
    let isVerifiedPurchase = 0;
    if (productId) {
      const purchase = db.prepare(`
        SELECT oi.id 
        FROM order_items oi
        JOIN orders o ON oi.orderId = o.id
        WHERE o.customerId = ? AND oi.productId = ? AND o.status = 'delivered'
      `).get(userId, productId);
      if (purchase) isVerifiedPurchase = 1;
    } else if (vendorId) {
      const purchase = db.prepare(`
        SELECT id FROM orders WHERE customerId = ? AND vendorId = ? AND status = 'delivered'
      `).get(userId, vendorId);
      if (purchase) isVerifiedPurchase = 1;
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    // Get user info
    const user = db.prepare('SELECT name, profileImage FROM users WHERE id = ?').get(userId) as any;
    
    const stmt = db.prepare(`
      INSERT INTO reviews (id, userId, userName, userProfileImage, productId, vendorId, rating, comment, isVerifiedPurchase, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, user.name, user.profileImage, productId || null, vendorId || null, rating, comment, isVerifiedPurchase, createdAt);
    
    res.json({ success: true, id });
    
    // Notify vendor if it's a vendor review or a review on their product
    let targetVendorId = vendorId;
    if (productId && !vendorId) {
      const product = db.prepare('SELECT vendorId FROM products WHERE id = ?').get(productId) as any;
      if (product) targetVendorId = product.vendorId;
    }
    
    if (targetVendorId) {
      const notifStmt = db.prepare('INSERT INTO notifications (id, userId, title, message, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)');
      notifStmt.run(
        uuidv4(),
        targetVendorId,
        'New Review Received',
        `${user.name} left a ${rating}-star review.`,
        'new_review',
        createdAt
      );
      io.emit('notifications_updated');
    }
    
    io.emit('products_updated');
    io.emit('vendors_updated');
  });

  // Chat
  app.get('/api/chat/conversations', authenticateToken, (req: any, res: any) => {
    const userId = req.user.id;
    // Get unique users that the current user has chatted with
    const stmt = db.prepare(`
      SELECT DISTINCT 
        CASE WHEN senderId = ? THEN receiverId ELSE senderId END as otherUserId
      FROM messages 
      WHERE senderId = ? OR receiverId = ?
    `);
    const otherUsers = stmt.all(userId, userId, userId) as any[];
    
    const conversations = otherUsers.map(u => {
      const otherUserId = u.otherUserId;
      const otherUser = db.prepare('SELECT id, name, profileImage, role, storeName FROM users WHERE id = ?').get(otherUserId) as any;
      
      const lastMessage = db.prepare(`
        SELECT * FROM messages 
        WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
        ORDER BY createdAt DESC LIMIT 1
      `).get(userId, otherUserId, otherUserId, userId) as any;
      
      const unreadCount = db.prepare(`
        SELECT COUNT(*) as count FROM messages 
        WHERE senderId = ? AND receiverId = ? AND isRead = 0
      `).get(otherUserId, userId) as any;
      
      return {
        otherUser,
        lastMessage: {
          ...lastMessage,
          isRead: Boolean(lastMessage.isRead)
        },
        unreadCount: unreadCount.count
      };
    });
    
    // Sort by last message time
    conversations.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
    
    res.json(conversations);
  });

  app.get('/api/chat/messages/:otherUserId', authenticateToken, (req: any, res: any) => {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    
    const stmt = db.prepare(`
      SELECT * FROM messages 
      WHERE (senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?)
      ORDER BY createdAt ASC
    `);
    const messages = stmt.all(userId, otherUserId, otherUserId, userId).map((m: any) => ({
      ...m,
      isRead: Boolean(m.isRead)
    }));
    
    // Mark as read
    db.prepare('UPDATE messages SET isRead = 1 WHERE senderId = ? AND receiverId = ?').run(otherUserId, userId);
    
    res.json(messages);
  });

  app.post('/api/chat/send', authenticateToken, (req: any, res: any) => {
    const { receiverId, content } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare('INSERT INTO messages (id, senderId, receiverId, content, createdAt) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, req.user.id, receiverId, content, createdAt);
    
    const message = { id, senderId: req.user.id, receiverId, content, isRead: false, createdAt };
    
    // Emit to both sender and receiver
    io.to(receiverId).emit('new_message', message);
    io.to(req.user.id).emit('new_message', message);
    
    res.json(message);
  });

  // Socket.io connection
  io.on('connection', (socket) => {
    console.log('Client connected');
    
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined their room`);
    });

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
