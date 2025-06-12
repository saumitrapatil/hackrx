const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const db = require('../database/database');

const router = express.Router();

// Create new project/inquiry
router.post('/initiate', authMiddleware, requireRole(['client']), async (req, res) => {
  try {
    const { property_id, developer_id, budget, timeline, requirements, message } = req.body;

    if (!property_id || !developer_id) {
      return res.status(400).json({
        success: false,
        message: 'Property ID and Developer ID are required'
      });
    }

    // Verify property exists and belongs to the developer
    const property = await db.get(
      'SELECT * FROM properties WHERE id = ? AND developer_id = ?',
      [property_id, developer_id]
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or does not belong to the specified developer'
      });
    }

    // Create project
    const result = await db.run(`
      INSERT INTO projects (property_id, client_id, developer_id, budget, timeline, requirements, status)
      VALUES (?, ?, ?, ?, ?, ?, 'inquiry')
    `, [property_id, req.user.id, developer_id, budget, timeline, requirements ? JSON.stringify(requirements) : null]);

    // Send initial message if provided
    if (message) {
      await db.run(`
        INSERT INTO messages (sender_id, receiver_id, project_id, message)
        VALUES (?, ?, ?, ?)
      `, [req.user.id, developer_id, result.id, message]);
    }

    // Get the created project with details
    const project = await db.get(`
      SELECT p.*, 
             prop.title as property_title, prop.location as property_location,
             client.name as client_name, client.email as client_email,
             dev.name as developer_name, dev.email as developer_email
      FROM projects p
      JOIN properties prop ON p.property_id = prop.id
      JOIN users client ON p.client_id = client.id
      JOIN users dev ON p.developer_id = dev.id
      WHERE p.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Project inquiry created successfully',
      project
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
router.get('/my', authMiddleware, async (req, res) => {
  try {
    let query;
    let params = [req.user.id];

    if (req.user.role === 'client') {
      query = `
        SELECT p.*, 
               prop.title as property_title, prop.location as property_location, 
               prop.images as property_images,
               dev.name as developer_name, dev.email as developer_email, dev.phone as developer_phone
        FROM projects p
        JOIN properties prop ON p.property_id = prop.id
        JOIN users dev ON p.developer_id = dev.id
        WHERE p.client_id = ?
        ORDER BY p.created_at DESC
      `;
    } else if (req.user.role === 'developer') {
      query = `
        SELECT p.*, 
               prop.title as property_title, prop.location as property_location,
               prop.images as property_images,
               client.name as client_name, client.email as client_email, client.phone as client_phone
        FROM projects p
        JOIN properties prop ON p.property_id = prop.id
        JOIN users client ON p.client_id = client.id
        WHERE p.developer_id = ?
        ORDER BY p.created_at DESC
      `;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const projects = await db.all(query, params);

    // Parse JSON fields
    projects.forEach(project => {
      if (project.requirements) {
        try {
          project.requirements = JSON.parse(project.requirements);
        } catch (e) {
          project.requirements = null;
        }
      }
      if (project.property_images) {
        try {
          project.property_images = JSON.parse(project.property_images);
        } catch (e) {
          project.property_images = [];
        }
      }
    });

    res.json({
      success: true,
      projects
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

// Get project by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;

    const project = await db.get(`
      SELECT p.*, 
             prop.title as property_title, prop.location as property_location, 
             prop.description as property_description, prop.images as property_images,
             prop.price_range, prop.area_sqft, prop.bedrooms, prop.bathrooms,
             client.name as client_name, client.email as client_email, client.phone as client_phone,
             dev.name as developer_name, dev.email as developer_email, dev.phone as developer_phone
      FROM projects p
      JOIN properties prop ON p.property_id = prop.id
      JOIN users client ON p.client_id = client.id
      JOIN users dev ON p.developer_id = dev.id
      WHERE p.id = ?
    `, [projectId]);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user has access to this project
    if (req.user.role === 'client' && project.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    if (req.user.role === 'developer' && project.developer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Parse JSON fields
    if (project.requirements) {
      try {
        project.requirements = JSON.parse(project.requirements);
      } catch (e) {
        project.requirements = null;
      }
    }
    if (project.property_images) {
      try {
        project.property_images = JSON.parse(project.property_images);
      } catch (e) {
        project.property_images = [];
      }
    }

    res.json({
      success: true,
      project
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
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { status, notes } = req.body;

    const validStatuses = ['inquiry', 'under_review', 'negotiating', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get project to verify access
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'client' && project.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    if (req.user.role === 'developer' && project.developer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update project
    await db.run(`
      UPDATE projects 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, projectId]);

    // Add status update message if notes provided
    if (notes) {
      const receiverId = req.user.role === 'client' ? project.developer_id : project.client_id;
      await db.run(`
        INSERT INTO messages (sender_id, receiver_id, project_id, message)
        VALUES (?, ?, ?, ?)
      `, [req.user.id, receiverId, projectId, `Project status updated to "${status}". ${notes}`]);
    }

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

// Update project details
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { budget, timeline, requirements } = req.body;

    // Get project to verify access
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions (only client can update their project details)
    if (req.user.role !== 'client' || project.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update project
    await db.run(`
      UPDATE projects 
      SET budget = ?, timeline = ?, requirements = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [budget, timeline, requirements ? JSON.stringify(requirements) : null, projectId]);

    // Get updated project
    const updatedProject = await db.get(`
      SELECT p.*, 
             prop.title as property_title, prop.location as property_location,
             dev.name as developer_name
      FROM projects p
      JOIN properties prop ON p.property_id = prop.id
      JOIN users dev ON p.developer_id = dev.id
      WHERE p.id = ?
    `, [projectId]);

    res.json({
      success: true,
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message
    });
  }
});

// Get project timeline/messages
router.get('/:id/timeline', authMiddleware, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Verify project access
    const project = await db.get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    if (req.user.role === 'client' && project.client_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    if (req.user.role === 'developer' && project.developer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get project messages/timeline
    const messages = await db.all(`
      SELECT m.*, 
             sender.name as sender_name, sender.role as sender_role,
             receiver.name as receiver_name, receiver.role as receiver_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.project_id = ?
      ORDER BY m.sent_at ASC
    `, [projectId]);

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get project timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project timeline',
      error: error.message
    });
  }
});

module.exports = router;