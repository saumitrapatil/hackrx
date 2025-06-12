const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const db = require('../database/database');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await db.get(`
      SELECT id, email, role, name, phone, location, preferences, 
             verification_status, subscription_plan, profile_image, created_at
      FROM users WHERE id = ?
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Parse preferences if they exist
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        user.preferences = null;
      }
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, location, preferences } = req.body;
    const userId = req.user.id;

    await db.run(`
      UPDATE users 
      SET name = ?, phone = ?, location = ?, preferences = ?
      WHERE id = ?
    `, [name, phone, location, preferences ? JSON.stringify(preferences) : null, userId]);

    // Get updated user data
    const updatedUser = await db.get(`
      SELECT id, email, role, name, phone, location, preferences, 
             verification_status, subscription_plan, profile_image, created_at
      FROM users WHERE id = ?
    `, [userId]);

    // Parse preferences
    if (updatedUser.preferences) {
      try {
        updatedUser.preferences = JSON.parse(updatedUser.preferences);
      } catch (e) {
        updatedUser.preferences = null;
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Upload profile image
router.post('/profile/image', authMiddleware, setUploadType('profiles'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imagePath = `/uploads/profiles/${req.file.filename}`;
    
    await db.run('UPDATE users SET profile_image = ? WHERE id = ?', [imagePath, req.user.id]);

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      imagePath
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: error.message
    });
  }
});

// Get all developers (for client searches)
router.get('/developers', authMiddleware, async (req, res) => {
  try {
    const developers = await db.all(`
      SELECT id, name, phone, location, verification_status, 
             subscription_plan, profile_image, created_at
      FROM users 
      WHERE role = 'developer' AND verification_status = 'verified'
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      developers
    });
  } catch (error) {
    console.error('Get developers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get developers',
      error: error.message
    });
  }
});

// Get developer portfolio
router.get('/developers/:id/portfolio', authMiddleware, async (req, res) => {
  try {
    const developerId = req.params.id;

    // Get developer info
    const developer = await db.get(`
      SELECT id, name, phone, location, verification_status, 
             subscription_plan, profile_image, created_at
      FROM users 
      WHERE id = ? AND role = 'developer'
    `, [developerId]);

    if (!developer) {
      return res.status(404).json({
        success: false,
        message: 'Developer not found'
      });
    }

    // Get developer's properties
    const properties = await db.all(`
      SELECT id, title, description, location, city, state, property_type,
             price_range, area_sqft, bedrooms, bathrooms, amenities, images,
             status, featured, created_at
      FROM properties 
      WHERE developer_id = ?
      ORDER BY featured DESC, created_at DESC
    `, [developerId]);

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
      developer,
      properties
    });
  } catch (error) {
    console.error('Get developer portfolio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get developer portfolio',
      error: error.message
    });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get current user with password
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

module.exports = router;