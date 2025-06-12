const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await dbGet(`
            SELECT id, email, role, name, phone, location, preferences, 
                   verification_status, subscription_plan, avatar_url, 
                   company_name, company_description, created_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Parse JSON fields
        user.preferences = JSON.parse(user.preferences || '{}');

        res.json({
            success: true,
            data: { user }
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
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, location, preferences, company_name, company_description } = req.body;
        
        const result = await dbRun(`
            UPDATE users SET 
                name = COALESCE(?, name),
                phone = COALESCE(?, phone),
                location = COALESCE(?, location),
                preferences = COALESCE(?, preferences),
                company_name = COALESCE(?, company_name),
                company_description = COALESCE(?, company_description)
            WHERE id = ?
        `, [
            name, phone, location, 
            preferences ? JSON.stringify(preferences) : null,
            company_name, company_description, req.user.id
        ]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
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

// Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const avatarUrl = `/uploads/users/avatars/${req.file.filename}`;
        
        await dbRun(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [avatarUrl, req.user.id]
        );

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: { avatar_url: avatarUrl }
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload avatar',
            error: error.message
        });
    }
});

// Get all developers
router.get('/developers', authenticateToken, async (req, res) => {
    try {
        const developers = await dbAll(`
            SELECT id, name, email, phone, location, company_name, 
                   company_description, avatar_url, created_at
            FROM users 
            WHERE role = 'developer' AND verification_status = 'verified'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: { developers }
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
router.get('/developers/:id/portfolio', authenticateToken, async (req, res) => {
    try {
        const developerId = req.params.id;

        // Get developer info
        const developer = await dbGet(`
            SELECT id, name, email, phone, location, company_name, 
                   company_description, avatar_url, created_at
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
        const properties = await dbAll(`
            SELECT id, title, description, location, city, state, 
                   property_type, price_range, area_sqft, bedrooms, 
                   bathrooms, amenities, images, status, featured, created_at
            FROM properties 
            WHERE developer_id = ?
            ORDER BY created_at DESC
        `, [developerId]);

        // Parse JSON fields
        properties.forEach(property => {
            property.amenities = JSON.parse(property.amenities || '[]');
            property.images = JSON.parse(property.images || '[]');
        });

        res.json({
            success: true,
            data: {
                developer,
                properties
            }
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

// Mock KYC verification
router.post('/kyc-verification', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        const { document_type } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Document is required'
            });
        }

        // In a real app, you would process the document
        // For demo, we'll just mark as verified
        await dbRun(
            'UPDATE users SET verification_status = ? WHERE id = ?',
            ['verified', req.user.id]
        );

        res.json({
            success: true,
            message: 'KYC document uploaded successfully. Verification in progress.'
        });
    } catch (error) {
        console.error('KYC verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload KYC document',
            error: error.message
        });
    }
});

module.exports = router;