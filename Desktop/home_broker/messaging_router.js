const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Send message
router.post('/send', authenticateToken, upload.single('attachment'), async (req, res) => {
    try {
        const { receiver_id, project_id, message } = req.body;

        if (!receiver_id || !message) {
            return res.status(400).json({
                success: false,
                message: 'Receiver ID and message are required'
            });
        }

        // Verify receiver exists
        const receiver = await dbGet(
            'SELECT id FROM users WHERE id = ?',
            [receiver_id]
        );

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'Receiver not found'
            });
        }

        // If project_id is provided, verify project access
        if (project_id) {
            const project = await dbGet(
                'SELECT client_id, developer_id, broker_id FROM projects WHERE id = ?',
                [project_id]
            );

            if (project) {
                const hasProjectAccess = project.client_id === req.user.id || 
                                       project.developer_id === req.user.id || 
                                       project.broker_id === req.user.id;

                if (!hasProjectAccess) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied to this project'
                    });
                }
            }
        }

        const attachmentPath = req.file ? `/uploads/documents/${req.file.filename}` : null;

        const result = await dbRun(`
            INSERT INTO messages (sender_id, receiver_id, project_id, message, attachment_path)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, receiver_id, project_id, message, attachmentPath]);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: { message_id: result.id }
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
});

// Get conversations for user
router.get('/conversations', authenticateToken, async (req, res) => {
    try {
        // Get all conversations where user is either sender or receiver
        const conversations = await dbAll(`
            SELECT 
                CASE 
                    WHEN m.sender_id = ? THEN m.receiver_id 
                    ELSE m.sender_id 
                END as other_user_id,
                MAX(m.sent_at) as last_message_time,
                m.message as last_message,
                u.name as other_user_name,
                u.avatar_url as other_user_avatar,
                u.role as other_user_role,
                m.project_id,
                COUNT(CASE WHEN m.receiver_id = ? AND m.read_status = 0 THEN 1 END) as unread_count
            FROM messages m
            JOIN users u ON (
                CASE 
                    WHEN m.sender_id = ? THEN m.receiver_id = u.id
                    ELSE m.sender_id = u.id
                END
            )
            WHERE m.sender_id = ? OR m.receiver_id = ?
            GROUP BY 
                CASE 
                    WHEN m.sender_id = ? THEN m.receiver_id 
                    ELSE m.sender_id 
                END,
                m.project_id
            ORDER BY last_message_time DESC
        `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

        res.json({
            success: true,
            data: { conversations }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversations',
            error: error.message
        });
    }
});

// Get messages between two users
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const { project_id, page = 1, limit = 50 } = req.query;

        let query = `
            SELECT m.*, 
                   us.name as sender_name, us.avatar_url as sender_avatar,
                   ur.name as receiver_name, ur.avatar_url as receiver_avatar
            FROM messages m
            JOIN users us ON m.sender_id = us.id
            JOIN users ur ON m.receiver_id = ur.id
            WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
        `;
        
        let queryParams = [req.user.id, otherUserId, otherUserId, req.user.id];

        if (project_id) {
            query += ' AND m.project_id = ?';
            queryParams.push(project_id);
        }

        query += ' ORDER BY m.sent_at DESC LIMIT ? OFFSET ?';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        queryParams.push(parseInt(limit), offset);

        const messages = await dbAll(query, queryParams);

        // Mark messages as read
        await dbRun(`
            UPDATE messages 
            SET read_status = 1 
            WHERE sender_id = ? AND receiver_id = ? AND read_status = 0
        `, [otherUserId, req.user.id]);

        res.json({
            success: true,
            data: { messages: messages.reverse() } // Reverse to show oldest first
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

// Get project messages
router.get('/project/:projectId', authenticateToken, async (req, res) => {
    try {
        const projectId = req.params.projectId;

        // Verify project access
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

        const messages = await dbAll(`
            SELECT m.*, 
                   us.name as sender_name, us.avatar_url as sender_avatar, us.role as sender_role
            FROM messages m
            JOIN users us ON m.sender_id = us.id
            WHERE m.project_id = ?
            ORDER BY m.sent_at ASC
        `, [projectId]);

        // Mark messages as read for current user
        await dbRun(`
            UPDATE messages 
            SET read_status = 1 
            WHERE project_id = ? AND receiver_id = ? AND read_status = 0
        `, [projectId, req.user.id]);

        res.json({
            success: true,
            data: { messages }
        });
    } catch (error) {
        console.error('Get project messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get project messages',
            error: error.message
        });
    }
});

// Get unread message count
router.get('/unread/count', authenticateToken, async (req, res) => {
    try {
        const result = await dbGet(`
            SELECT COUNT(*) as unread_count
            FROM messages
            WHERE receiver_id = ? AND read_status = 0
        `, [req.user.id]);

        res.json({
            success: true,
            data: { unread_count: result.unread_count }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count',
            error: error.message
        });
    }
});

// Mark message as read
router.put('/:messageId/read', authenticateToken, async (req, res) => {
    try {
        const messageId = req.params.messageId;

        const result = await dbRun(`
            UPDATE messages 
            SET read_status = 1 
            WHERE id = ? AND receiver_id = ?
        `, [messageId, req.user.id]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or access denied'
            });
        }

        res.json({
            success: true,
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Mark message as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark message as read',
            error: error.message
        });
    }
});

module.exports = router;