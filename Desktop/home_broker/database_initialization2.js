const db = require('./database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Create uploads directory
const createUploadDirectories = () => {
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const subdirs = ['properties', 'profiles', 'documents'];
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  
  subdirs.forEach(subdir => {
    const dirPath = path.join(uploadDir, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });
  
  console.log('📁 Upload directories created');
};

// Create database tables
const createTables = async () => {
  try {
    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('client', 'developer', 'broker', 'admin')),
        name TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        preferences TEXT,
        verification_status TEXT DEFAULT 'pending',
        subscription_plan TEXT DEFAULT 'basic',
        profile_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Properties table
    await db.run(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        developer_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        property_type TEXT NOT NULL,
        price_range TEXT NOT NULL,
        area_sqft INTEGER,
        bedrooms INTEGER,
        bathrooms INTEGER,
        amenities TEXT,
        images TEXT,
        status TEXT DEFAULT 'available',
        featured BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (developer_id) REFERENCES users(id)
      )
    `);

    // Projects table
    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        developer_id INTEGER NOT NULL,
        broker_id INTEGER,
        status TEXT DEFAULT 'inquiry',
        budget TEXT,
        timeline TEXT,
        requirements TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (developer_id) REFERENCES users(id),
        FOREIGN KEY (broker_id) REFERENCES users(id)
      )
    `);

    // Messages table
    await db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        project_id INTEGER,
        message TEXT NOT NULL,
        attachment_path TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_status BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (receiver_id) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
};

// Insert sample data
const insertSampleData = async () => {
  try {
    // Check if data already exists
    const existingUser = await db.get('SELECT id FROM users LIMIT 1');
    if (existingUser) {
      console.log('📊 Sample data already exists, skipping insertion');
      return;
    }

    // Hash password for sample users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Sample users
    const users = [
      {
        email: 'client1@example.com',
        password: hashedPassword,
        role: 'client',
        name: 'John Smith',
        phone: '+1-555-0101',
        location: 'Manhattan, NY',
        preferences: JSON.stringify({
          budget: '$5M-$10M',
          propertyTypes: ['penthouse', 'mansion'],
          amenities: ['pool', 'gym', 'concierge']
        }),
        verification_status: 'verified',
        subscription_plan: 'premium'
      },
      {
        email: 'client2@example.com',
        password: hashedPassword,
        role: 'client',
        name: 'Sarah Johnson',
        phone: '+1-555-0102',
        location: 'Beverly Hills, CA',
        preferences: JSON.stringify({
          budget: '$10M-$20M',
          propertyTypes: ['villa', 'estate'],
          amenities: ['ocean_view', 'wine_cellar', 'home_theater']
        }),
        verification_status: 'verified',
        subscription_plan: 'premium'
      },
      {
        email: 'developer1@example.com',
        password: hashedPassword,
        role: 'developer',
        name: 'Premium Developments LLC',
        phone: '+1-555-0201',
        location: 'New York, NY',
        verification_status: 'verified',
        subscription_plan: 'business'
      },
      {
        email: 'developer2@example.com',
        password: hashedPassword,
        role: 'developer',
        name: 'Luxury Estates Group',
        phone: '+1-555-0202',
        location: 'Los Angeles, CA',
        verification_status: 'verified',
        subscription_plan: 'business'
      },
      {
        email: 'broker1@example.com',
        password: hashedPassword,
        role: 'broker',
        name: 'Michael Chen',
        phone: '+1-555-0301',
        location: 'Miami, FL',
        verification_status: 'verified',
        subscription_plan: 'professional'
      }
    ];

    // Insert users
    for (const user of users) {
      await db.run(`
        INSERT INTO users (email, password, role, name, phone, location, preferences, verification_status, subscription_plan)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [user.email, user.password, user.role, user.name, user.phone, user.location, user.preferences || null, user.verification_status, user.subscription_plan]);
    }

    // Sample properties
    const properties = [
      {
        developer_id: 3, // Premium Developments LLC
        title: 'Manhattan Penthouse Suite',
        description: 'Luxurious penthouse with panoramic city views, featuring modern amenities and premium finishes.',
        location: '432 Park Avenue, Manhattan',
        city: 'New York',
        state: 'NY',
        property_type: 'penthouse',
        price_range: '$8M-$12M',
        area_sqft: 4500,
        bedrooms: 4,
        bathrooms: 5,
        amenities: JSON.stringify(['concierge', 'gym', 'pool', 'valet_parking', 'city_view']),
        images: JSON.stringify(['/uploads/properties/penthouse1.jpg', '/uploads/properties/penthouse2.jpg']),
        status: 'available',
        featured: true
      },
      {
        developer_id: 4, // Luxury Estates Group
        title: 'Beverly Hills Villa',
        description: 'Stunning Mediterranean-style villa with pool, tennis court, and mountain views.',
        location: '1010 Beverly Drive, Beverly Hills',
        city: 'Beverly Hills',
        state: 'CA',
        property_type: 'villa',
        price_range: '$15M-$20M',
        area_sqft: 8000,
        bedrooms: 6,
        bathrooms: 8,
        amenities: JSON.stringify(['pool', 'tennis_court', 'wine_cellar', 'home_theater', 'mountain_view']),
        images: JSON.stringify(['/uploads/properties/villa1.jpg', '/uploads/properties/villa2.jpg']),
        status: 'available',
        featured: true
      },
      {
        developer_id: 3,
        title: 'Hamptons Estate',
        description: 'Waterfront estate with private beach access and luxury amenities.',
        location: '123 Ocean Drive, The Hamptons',
        city: 'East Hampton',
        state: 'NY',
        property_type: 'estate',
        price_range: '$25M-$30M',
        area_sqft: 12000,
        bedrooms: 8,
        bathrooms: 10,
        amenities: JSON.stringify(['private_beach', 'pool', 'guest_house', 'boat_dock', 'ocean_view']),
        images: JSON.stringify(['/uploads/properties/estate1.jpg', '/uploads/properties/estate2.jpg']),
        status: 'available',
        featured: true
      }
    ];

    // Insert properties
    for (const property of properties) {
      await db.run(`
        INSERT INTO properties (developer_id, title, description, location, city, state, property_type, price_range, area_sqft, bedrooms, bathrooms, amenities, images, status, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [property.developer_id, property.title, property.description, property.location, property.city, property.state, property.property_type, property.price_range, property.area_sqft, property.bedrooms, property.bathrooms, property.amenities, property.images, property.status, property.featured]);
    }

    // Sample projects
    await db.run(`
      INSERT INTO projects (property_id, client_id, developer_id, broker_id, status, budget, timeline, requirements)
      VALUES (1, 1, 3, 5, 'active', '$8M-$10M', '6 months', '{"customizations": ["smart_home", "custom_kitchen"], "timeline": "flexible"}')
    `);

    // Sample messages
    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, project_id, message)
      VALUES (1, 3, 1, 'Hello, I am very interested in the Manhattan penthouse. Could we schedule a viewing?')
    `);

    await db.run(`
      INSERT INTO messages (sender_id, receiver_id, project_id, message)
      VALUES (3, 1, 1, 'Thank you for your interest! I would be happy to arrange a private viewing. What days work best for you?')
    `);

    console.log('✅ Sample data inserted successfully');
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
  }
};

// Initialize database
const initDatabase = async () => {
  console.log('🔧 Initializing database...');
  createUploadDirectories();
  await createTables();
  await insertSampleData();
  console.log('🎉 Database initialization complete!');
};

// Export the initialization function
module.exports = initDatabase;

// Run initialization if this file is executed directly
if (require.main === module) {
  initDatabase();
}