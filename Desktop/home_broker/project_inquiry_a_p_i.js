const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create new project inquiry
router.post('/initiate', authenticateToken, async (req, res) => {
    try {
        const { property_id, developer_id, budget, timeline, requirements } = req.body;

        if (!property_id || !developer_id) {
            return res.status(400).json({
                success: false,
                message: 'Property ID and Developer ID are required'
            });
        }

        // Verify property exists
        const property = await dbGet(
            'SELECT id, developer_id FROM properties WHERE id = ?',
            [property_id]
        );

        if (!property) {
            return res.status(404).json({
                success: false,
                message: 'Property not found'
            });
        }

        if (property.developer_id != developer_id) {
            return res.status(400).json({
                success: false,
                message: 'Property does not belong to specified developer'
            });
        }

        // Create project
        const result = await dbRun(`
            INSERT INTO projects (property_id, client_id, developer_id, budget, timeline, requirements)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            property_id,
            req.user.id,
            developer_id,
            budget,
            timeline,
            JSON.stringify(requirements || {})
        ]);

        res.status(201).json({
            success: true,
            message: 'Project inquiry created successfully',
            data: { project_id: result.id }
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project inquiry',
            error: error.message
        });
    }
});

// Get user's projects
router.get('/my-projects', authenticateToken, async (req, res) => {
    try {
        let query;
        let params = [req.user.id];

        if (req.user.role === 'client') {
            query = `
                SELECT pr.*, p.title as property_title, p.location as property_location,
                       u.name as developer_name, u.company_name
                FROM projects pr
                JOIN properties p ON pr.property_id = p.id
                JOIN users u ON pr.developer_id = u.id
                WHERE pr.client_id = ?
                ORDER BY pr.created_at DESC
            `;
        } else if (req.user.role === 'developer') {
            query = `
                SELECT pr.*, p.title as property_title, p.location as property_location,
                       u.name as client_name, u.phone as client_phone
                FROM projects pr
                JOIN properties p ON pr.property_id = p.id
                JOIN users u ON pr.client_id = u.id
                WHERE pr.developer_id = ?
                ORDER BY pr.created_at DESC
            `;
        } else if (req.user.role === 'broker') {
            query = `
                SELECT pr.*, p.title as property_title, p.location as property_location,
                       uc.name as client_name, ud.name as developer_name, ud.company_name
                FROM projects pr
                JOIN properties p ON pr.property_id = p.id
                JOIN users uc ON pr.client_id = uc.id
                JOIN users ud ON pr.developer_id = ud.id
                WHERE pr.broker_id = ?
                ORDER BY pr.created_at DESC
            `;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const projects = await dbAll(query, params);

        // Parse JSON fields
        projects.forEach(project => {
            project.requirements = JSON.parse(project.requirements || '{}');
        });

        res.json({
            success: true,
            data: { projects }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get projects',
            error: error.message
        });
    }
});

// Get project details
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;

        const project = await dbGet(`
            SELECT pr.*, p.title as property_title, p.description as property_description,
                   p.location as property_location, p.images as property_images,
                   uc.name as client_name, uc.phone as client_phone, uc.email as client_email,
                   ud.name as developer_name, ud.company_name, ud.phone as developer_phone, ud.email as developer_email
            FROM projects pr
            JOIN properties p ON pr.property_id = p.id
            JOIN users uc ON pr.client_id = uc.id
            JOIN users ud ON pr.developer_id = ud.id
            WHERE pr.id = ?
        `, [projectId]);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check access permissions
        const hasAccess = project.client_id === req.user.id || 
                         project.developer_id === req.user.id || 
                         project.broker_id === req.user.id ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Parse JSON fields
        project.requirements = JSON.parse(project.requirements || '{}');
        project.property_images = JSON.parse(project.property_images || '[]');

        res.json({
            success: true,
            data: { project }
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project',
            error: error.message
        });
    }
});

// Update project status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['inquiry', 'negotiation', 'contract', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Get project to check permissions
        const project = await dbGet(
            'SELECT client_id, developer_id, broker_id FROM projects WHERE id = ?',
            [projectId]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Check permissions
        const hasAccess = project.client_id === req.user.id || 
                         project.developer_id === req.user.id || 
                         project.broker_id === req.user.id ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await dbRun(
            'UPDATE projects SET status = ? WHERE id = ?',
            [status, projectId]
        );

        res.json({
            success: true,
            message: 'Project status updated successfully'
        });
    } catch (error) {
        console.error('Update project status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project status',
            error: error.message
        });
    }
});

// Update project timeline/milestone
router.put('/:id/milestone', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { timeline } = req.body;

        // Get project to check permissions
        const project = await dbGet(
            'SELECT developer_id FROM projects WHERE id = ?',
            [projectId]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Only developer can update timeline
        if (project.developer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only the developer can update project timeline'
            });
        }

        await dbRun(
            'UPDATE projects SET timeline = ? WHERE id = ?',
            [timeline, projectId]
        );

        res.json({
            success: true,
            message: 'Project timeline updated successfully'
        });
    } catch (error) {
        console.error('Update project timeline error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update project timeline',
            error: error.message
        });
    }
});

// Assign broker to project
router.put('/:id/assign-broker', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.id;
        const { broker_id } = req.body;

        // Verify broker exists
        const broker = await dbGet(
            'SELECT id FROM users WHERE id = ? AND role = ?',
            [broker_id, 'broker']
        );

        if (!broker) {
            return res.status(404).json({
                success: false,
                message: 'Broker not found'
            });
        }

        // Get project to check permissions
        const project = await dbGet(
            'SELECT client_id, developer_id FROM projects WHERE id = ?',
            [projectId]
        );

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Only client or developer can assign broker
        const hasAccess = project.client_id === req.user.id || 
                         project.developer_id === req.user.id ||
                         req.user.role === 'admin';

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await dbRun(
            'UPDATE projects SET broker_id = ? WHERE id = ?',
            [broker_id, projectId]
        );

        res.json({
            success: true,
            message: 'Broker assigned to project successfully'
        });
    } catch (error) {
        console.error('Assign broker error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign broker',
            error: error.message
        });
    }
});

module.exports = router;