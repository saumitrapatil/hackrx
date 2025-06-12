
const { dbRun, dbGet } = require('./database');
const bcrypt = require('bcryptjs');

const createTables = async () => {
    try {
        // Users table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('client', 'developer', 'broker', 'admin')),
                name TEXT NOT NULL,
                phone TEXT,
                location TEXT,
                preferences TEXT DEFAULT '{}',
                verification_status TEXT DEFAULT 'pending',
                subscription_plan TEXT DEFAULT 'basic',
                avatar_url TEXT,
                company_name TEXT,
                company_description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Properties table
        await dbRun(`
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
                amenities TEXT DEFAULT '[]',
                images TEXT DEFAULT '[]',
                status TEXT DEFAULT 'available',
                featured BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES users(id)
            )
        `);

        // Projects table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                property_id INTEGER NOT NULL,
                client_id INTEGER NOT NULL,
                developer_id INTEGER NOT NULL,
                broker_id INTEGER,
                status TEXT DEFAULT 'inquiry',
                budget TEXT,
                timeline TEXT,
                requirements TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (property_id) REFERENCES properties(id),
                FOREIGN KEY (client_id) REFERENCES users(id),
                FOREIGN KEY (developer_id) REFERENCES users(id),
                FOREIGN KEY (broker_id) REFERENCES users(id)
            )
        `);

        // Messages table
        await dbRun(`
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
        throw error;
    }
};

const insertSampleData = async () => {
    try {
        // Check if sample data already exists
        const existingUser = await dbGet('SELECT id FROM users LIMIT 1');
        if (existingUser) {
            console.log('📋 Sample data already exists, skipping insertion');
            return;
        }

        // Hash password for sample users
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Sample users
        const sampleUsers = [
            {
                email: 'admin@premiumestate.com',
                password: hashedPassword,
                role: 'admin',
                name: 'System Administrator',
                phone: '+1-555-0001',
                location: 'New York, NY'
            },
            {
                email: 'john.client@email.com',
                password: hashedPassword,
                role: 'client',
                name: 'John Smith',
                phone: '+1-555-0101',
                location: 'Beverly Hills, CA',
                preferences: JSON.stringify({
                    budget: '5000000-10000000',
                    propertyType: 'villa',
                    location: 'California',
                    amenities: ['pool', 'gym', 'garden']
                })
            },
            {
                email: 'luxury.developments@email.com',
                password: hashedPassword,
                role: 'developer',
                name: 'Michael Johnson',
                phone: '+1-555-0201',
                location: 'Los Angeles, CA',
                company_name: 'Luxury Developments Inc.',
                company_description: 'Premier luxury villa and mansion developer with 20+ years experience'
            },
            {
                email: 'sarah.broker@email.com',
                password: hashedPassword,
                role: 'broker',
                name: 'Sarah Williams',
                phone: '+1-555-0301',
                location: 'Miami, FL',
                company_name: 'Elite Property Brokers'
            }
        ];

        for (const user of sampleUsers) {
            await dbRun(`
                INSERT INTO users (email, password, role, name, phone, location, preferences, company_name, company_description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                user.email, user.password, user.role, user.name, user.phone, 
                user.location, user.preferences || '{}', user.company_name || null, user.company_description || null
            ]);
        }

        // Sample properties
        const sampleProperties = [
            {
                developer_id: 3, // Luxury Developments Inc.
                title: 'Beverly Hills Luxury Villa',
                description: 'Stunning 8-bedroom luxury villa with panoramic city views, infinity pool, and premium finishes throughout.',
                location: 'Beverly Hills, CA',
                city: 'Beverly Hills',
                state: 'California',
                property_type: 'villa',
                price_range: '8000000-12000000',
                area_sqft: 12000,
                bedrooms: 8,
                bathrooms: 10,
                amenities: JSON.stringify(['infinity_pool', 'home_theater', 'wine_cellar', 'gym', 'spa', 'garden']),
                images: JSON.stringify(['/uploads/properties/villa1_1.jpg', '/uploads/properties/villa1_2.jpg']),
                featured: true
            },
            {
                developer_id: 3,
                title: 'Malibu Oceanfront Mansion',
                description: 'Exclusive oceanfront mansion with private beach access, 6 bedrooms, and world-class amenities.',
                location: 'Malibu, CA',
                city: 'Malibu',
                state: 'California',
                property_type: 'mansion',
                price_range: '15000000-20000000',
                area_sqft: 15000,
                bedrooms: 6,
                bathrooms: 8,
                amenities: JSON.stringify(['private_beach', 'infinity_pool', 'tennis_court', 'helicopter_pad', 'wine_cellar']),
                images: JSON.stringify(['/uploads/properties/mansion1_1.jpg', '/uploads/properties/mansion1_2.jpg']),
                featured: true
            },
            {
                developer_id: 3,
                title: 'Modern Penthouse Suite',
                description: 'Ultra-modern penthouse with floor-to-ceiling windows, rooftop terrace, and city skyline views.',
                location: 'Downtown Los Angeles, CA',
                city: 'Los Angeles',
                state: 'California',
                property_type: 'penthouse',
                price_range: '5000000-8000000',
                area_sqft: 8000,
                bedrooms: 4,
                bathrooms: 6,
                amenities: JSON.stringify(['rooftop_terrace', 'concierge', 'valet', 'gym', 'pool']),
                images: JSON.stringify(['/uploads/properties/penthouse1_1.jpg']),
                featured: false
            }
        ];

        for (const property of sampleProperties) {
            await dbRun(`
                INSERT INTO properties (developer_id, title, description, location, city, state, property_type, 
                                      price_range, area_sqft, bedrooms, bathrooms, amenities, images, featured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                property.developer_id, property.title, property.description, property.location,
                property.city, property.state, property.property_type, property.price_range,
                property.area_sqft, property.bedrooms, property.bathrooms, property.amenities,
                property.images, property.featured
            ]);
        }

        console.log('✅ Sample data inserted successfully');
    } catch (error) {
        console.error('❌ Error inserting sample data:', error);
        throw error;
    }
};

const initDatabase = async () => {
    try {
        await createTables();
        await insertSampleData();
        console.log('🎉 Database initialization completed');
    } catch (error) {
        console.error('💥 Database initialization failed:', error);
        throw error;
    }
};

module.exports = {
    initDatabase
};