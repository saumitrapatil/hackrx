const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const db = require('../database/database');

const router = express.Router();

// Get all properties with filtering and pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      city, 
      state, 
      property_type, 
      min_price, 
      max_price, 
      bedrooms, 
      featured,
      search 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['status = ?'];
    let params = ['available'];

    // Build dynamic WHERE clause
    if (city) {
      whereConditions.push('LOWER(city) LIKE ?');
      params.push(`%${city.toLowerCase()}%`);
    }
    if (state) {
      whereConditions.push('LOWER(state) LIKE ?');
      params.push(`%${state.toLowerCase()}%`);
    }
    if (property_type) {
      whereConditions.push('property_type = ?');
      params.push(property_type);
    }
    if (bedrooms) {
      whereConditions.push('bedrooms >= ?');
      params.push(parseInt(bedrooms));
    }
    if (featured === 'true') {
      whereConditions.push('featured = ?');
      params.push(1);
    }
    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get properties with developer info
    const properties = await db.all(`
      SELECT p.*, u.name as developer_name, u.phone as developer_phone, 
             u.profile_image as developer_image
      FROM properties p
      JOIN users u ON p.developer_id = u.id
      WHERE ${whereClause}
      ORDER BY p.featured DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count for pagination
    const totalResult = await db.get(`
      SELECT COUNT(*) as total
      FROM properties p
      WHERE ${whereClause}
    `, params);

    // Parse JSON fields
    properties.forEach(property => {
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          property.amenities = [];
        }
      }
      if (property.images) {
        try {
          property.images = JSON.parse(property.images);
        } catch (e) {
          property.images = [];
        }
      }
    });

    res.json({
      success: true,
      properties,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalResult.total / limit),
        totalProperties: totalResult.total,
        hasNextPage: (page * limit) < totalResult.total,
        hasPreviousPage: page > 1
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
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const propertyId = req.params.id;

    const property = await db.get(`
      SELECT p.*, u.name as developer_name, u.phone as developer_phone, 
             u.email as developer_email, u.location as developer_location,
             u.profile_image as developer_image, u.verification_status as developer_verification
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
    if (property.amenities) {
      try {
        property.amenities = JSON.parse(property.amenities);
      } catch (e) {
        property.amenities = [];
      }
    }
    if (property.images) {
      try {
        property.images = JSON.parse(property.images);
      } catch (e) {
        property.images = [];
      }
    }

    res.json({
      success: true,
      property
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
router.post('/', authMiddleware, requireRole(['developer']), async (req, res) => {
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
      amenities,
      featured = false
    } = req.body;

    // Validate required fields
    if (!title || !location || !city || !state || !property_type || !price_range) {
      return res.status(400).json({
        success: false,
        message: 'Title, location, city, state, property type, and price range are required'
      });
    }

    const result = await db.run(`
      INSERT INTO properties (
        developer_id, title, description, location, city, state, 
        property_type, price_range, area_sqft, bedrooms, bathrooms, 
        amenities, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, title, description, location, city, state,
      property_type, price_range, area_sqft, bedrooms, bathrooms,
      amenities ? JSON.stringify(amenities) : null, featured
    ]);

    // Get the created property
    const newProperty = await db.get(`
      SELECT p.*, u.name as developer_name
      FROM properties p
      JOIN users u ON p.developer_id = u.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      property: newProperty
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

// Update property (developer only, own properties)
router.put('/:id', authMiddleware, requireRole(['developer']), async (req, res) => {
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

    // Check if property belongs to the developer
    const property = await db.get('SELECT * FROM properties WHERE id = ? AND developer_id = ?', [propertyId, req.user.id]);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or access denied'
      });
    }

    await db.run(`
      UPDATE properties 
      SET title = ?, description = ?, location = ?, city = ?, state = ?,
          property_type = ?, price_range = ?, area_sqft = ?, bedrooms = ?,
          bathrooms = ?, amenities = ?, status = ?, featured = ?
      WHERE id = ?
    `, [
      title, description, location, city, state, property_type,
      price_range, area_sqft, bedrooms, bathrooms,
      amenities ? JSON.stringify(amenities) : null, status, featured,
      propertyId
    ]);

    // Get updated property
    const updatedProperty = await db.get(`
      SELECT p.*, u.name as developer_name
      FROM properties p
      JOIN users u ON p.developer_id = u.id
      WHERE p.id = ?
    `, [propertyId]);

    res.json({
      success: true,
      message: 'Property updated successfully',
      property: updatedProperty
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

// Upload property images
router.post('/:id/images', authMiddleware, requireRole(['developer']), setUploadType('properties'), upload.array('images', 10), async (req, res) => {
  try {
    const propertyId = req.params.id;

    // Check if property belongs to the developer
    const property = await db.get('SELECT * FROM properties WHERE id = ? AND developer_id = ?', [propertyId, req.user.id]);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or access denied'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    // Get current images
    let currentImages = [];
    if (property.images) {
      try {
        currentImages = JSON.parse(property.images);
      } catch (e) {
        currentImages = [];
      }
    }

    // Add new image paths
    const newImages = req.files.map(file => `/uploads/properties/${file.filename}`);
    const allImages = [...currentImages, ...newImages];

    // Update property with new images
    await db.run('UPDATE properties SET images = ? WHERE id = ?', [JSON.stringify(allImages), propertyId]);

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: newImages,
      allImages: allImages
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

// Delete property (developer only, own properties)
router.delete('/:id', authMiddleware, requireRole(['developer']), async (req, res) => {
  try {
    const propertyId = req.params.id;

    // Check if property belongs to the developer
    const property = await db.get('SELECT * FROM properties WHERE id = ? AND developer_id = ?', [propertyId, req.user.id]);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or access denied'
      });
    }

    await db.run('DELETE FROM properties WHERE id = ?', [propertyId]);

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: error.message
    });
  }
});

// Get my properties (for developers)
router.get('/my/listings', authMiddleware, requireRole(['developer']), async (req, res) => {
  try {
    const properties = await db.all(`
      SELECT * FROM properties 
      WHERE developer_id = ?
      ORDER BY featured DESC, created_at DESC
    `, [req.user.id]);

    // Parse JSON fields
    properties.forEach(property => {
      if (property.amenities) {
        try {
          property.amenities = JSON.parse(property.amenities);
        } catch (e) {
          property.amenities = [];
        }
      }
      if (property.images) {
        try {
          property.images = JSON.parse(property.images);
        } catch (e) {
          property.images = [];
        }
      }
    });

    res.json({
      success: true,
      properties
    });
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get properties',
      error: error.message
    });
  }
});

module.exports = router;