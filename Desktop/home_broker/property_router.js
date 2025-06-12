const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Get all properties with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            city,
            state,
            property_type,
            min_price,
            max_price,
            bedrooms,
            bathrooms,
            featured,
            developer_id,
            page = 1,
            limit = 10
        } = req.query;

        let whereConditions = ['p.status = ?'];
        let queryParams = ['available'];

        // Add filters
        if (city) {
            whereConditions.push('p.city LIKE ?');
            queryParams.push(`%${city}%`);
        }
        if (state) {
            whereConditions.push('p.state LIKE ?');
            queryParams.push(`%${state}%`);
        }
        if (property_type) {
            whereConditions.push('p.property_type = ?');
            queryParams.push(property_type);
        }
        if (bedrooms) {
            whereConditions.push('p.bedrooms >= ?');
            queryParams.push(parseInt(bedrooms));
        }
        if (bathrooms) {
            whereConditions.push('p.bathrooms >= ?');
            queryParams.push(parseInt(bathrooms));
        }
        if (featured === 'true') {
            whereConditions.push('p.featured = ?');
            queryParams.push(true);
        }
        if (developer_id) {
            whereConditions.push('p.developer_id = ?');
            queryParams.push(developer_id);
        }

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query
        const whereClause = whereConditions.join(' AND ');
        const query = `
            SELECT p.*, u.name as developer_name, u.company_name, u.phone as developer_phone
            FROM properties p
            JOIN users u ON p.developer_id = u.id
            WHERE ${whereClause}
            ORDER BY p.featured DESC, p.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(parseInt(limit), offset);

        const properties = await dbAll(query, queryParams);

        // Parse JSON fields
        properties.forEach(property => {
            property.amenities = JSON.parse(property.amenities || '[]');
            property.images = JSON.parse(property.images || '[]');
        });

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM properties p
            WHERE ${whereClause}
        `;
        const countResult = await dbGet(countQuery, queryParams.slice(0, -2));

        res.json({
            success: true,
            data: {
                properties,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get properties error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get properties',
            error: error.message
        });
    }
});

// Get single property by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const propertyId = req.params.id;

        const property = await dbGet(`
            SELECT p.*, u.name as developer_name, u.company_name, u.company_description,
                   u.phone as developer_phone, u.email as developer_email, u.avatar_url as developer_avatar
            FROM properties p
            JOIN users u ON p.developer_id = u.id
            WHERE p.id = ?
        `, [propertyId]);

        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found'
            });
        }

        // Parse JSON fields
        property.amenities = JSON.parse(property.amenities || '[]');
        property.images = JSON.parse(property.images || '[]');

        res.json({
            success: true,
            data: { property }
        });
    } catch (error) {
        console.error('Get property error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get property',
            error: error.message
        });
    }
});

// Create new property (developer only)
router.post('/', authenticateToken, requireRole(['developer']), async (req, res) => {
    try {
        const {
            title,
            description,
            location,
            city,
            state,
            property_type,
            price_range,
            area_sqft,
            bedrooms,
            bathrooms,
            amenities
        } = req.body;

        // Validate required fields
        if (!title || !location || !city || !state || !property_type || !price_range) {
            return res.status(400).json({
                success: false,
                message: 'Title, location, city, state, property type, and price range are required'
            });
        }

        const result = await dbRun(`
            INSERT INTO properties (
                developer_id, title, description, location, city, state, 
                property_type, price_range, area_sqft, bedrooms, bathrooms, amenities
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, title, description, location, city, state,
            property_type, price_range, area_sqft, bedrooms, bathrooms,
            JSON.stringify(amenities || [])
        ]);

        res.status(201).json({
            success: true,
            message: 'Property created successfully',
            data: { property_id: result.id }
        });
    } catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create property',
            error: error.message
        });
    }
});

// Upload property images
router.post('/:id/images', authenticateToken, requireRole(['developer']), upload.array('images', 10), async (req, res) => {
    try {
        const propertyId = req.params.id;

        // Verify property belongs to the developer
        const property = await dbGet(
            'SELECT id, images FROM properties WHERE id = ? AND developer_id = ?',
            [propertyId, req.user.id]
        );

        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found or access denied'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }

        // Get existing images
        const existingImages = JSON.parse(property.images || '[]');

        // Add new image paths
        const newImages = req.files.map(file => `/uploads/properties/images/${file.filename}`);
        const allImages = [...existingImages, ...newImages];

        // Update property with new images
        await dbRun(
            'UPDATE properties SET images = ? WHERE id = ?',
            [JSON.stringify(allImages), propertyId]
        );

        res.json({
            success: true,
            message: 'Images uploaded successfully',
            data: { images: allImages }
        });
    } catch (error) {
        console.error('Upload property images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
});

// Update property (developer only)
router.put('/:id', authenticateToken, requireRole(['developer']), async (req, res) => {
    try {
        const propertyId = req.params.id;
        const {
            title,
            description,
            location,
            city,
            state,
            property_type,
            price_range,
            area_sqft,
            bedrooms,
            bathrooms,
            amenities,
            status,
            featured
        } = req.body;

        // Verify property belongs to the developer
        const existingProperty = await dbGet(
            'SELECT id FROM properties WHERE id = ? AND developer_id = ?',
            [propertyId, req.user.id]
        );

        if (!existingProperty) {
            return res.status(404).json({
                success: false,
                message: 'Property not found or access denied'
            });
        }

        const result = await dbRun(`
            UPDATE properties SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                location = COALESCE(?, location),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                property_type = COALESCE(?, property_type),
                price_range = COALESCE(?, price_range),
                area_sqft = COALESCE(?, area_sqft),
                bedrooms = COALESCE(?, bedrooms),
                bathrooms = COALESCE(?, bathrooms),
                amenities = COALESCE(?, amenities),
                status = COALESCE(?, status),
                featured = COALESCE(?, featured)
            WHERE id = ?
        `, [
            title, description, location, city, state, property_type,
            price_range, area_sqft, bedrooms, bathrooms,
            amenities ? JSON.stringify(amenities) : null,
            status, featured, propertyId
        ]);

        res.json({
            success: true,
            message: 'Property updated successfully'
        });
    } catch (error) {
        console.error('Update property error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update property',
            error: error.message
        });
    }
});

// Get property recommendations for client
router.get('/recommendations/:clientId', authenticateToken, async (req, res) => {
    try {
        const clientId = req.params.clientId;

        // Get client preferences
        const client = await dbGet(
            'SELECT preferences FROM users WHERE id = ? AND role = ?',
            [clientId, 'client']
        );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        const preferences = JSON.parse(client.preferences || '{}');

        // Build recommendation query based on preferences
        let whereConditions = ['p.status = ?'];
        let queryParams = ['available'];

        if (preferences.propertyType) {
            whereConditions.push('p.property_type = ?');
            queryParams.push(preferences.propertyType);
        }

        if (preferences.location) {
            whereConditions.push('(p.city LIKE ? OR p.state LIKE ?)');
            queryParams.push(`%${preferences.location}%`, `%${preferences.location}%`);
        }

        const query = `
            SELECT p.*, u.name as developer_name, u.company_name
            FROM properties p
            JOIN users u ON p.developer_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY p.featured DESC, p.created_at DESC
            LIMIT 10
        `;

        const recommendations = await dbAll(query, queryParams);

        // Parse JSON fields
        recommendations.forEach(property => {
            property.amenities = JSON.parse(property.amenities || '[]');
            property.images = JSON.parse(property.images || '[]');
        });

        res.json({
            success: true,
            data: { recommendations }
        });
    } catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
});

module.exports = router;