const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { upload, setUploadType } = require('../middleware/upload');
const db = require('../database/database');

const router = express.Router();

// Send message
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { receiver_id, project_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message content are required'
      });
    }

    // Verify receiver exists
    const receiver = await db.get('SELECT id FROM users WHERE id = ?', [receiver_id]);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // If project_id is provided, verify access
    if (project_id) {
      const project = await db.get(`
        SELECT * FROM projects 
        WHERE id = ? AND (client_id = ? OR developer_id = ?)
      `, [project_id, req.user.id, req.user.id]);

      if (!project) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this project'
        });
      }
    }

    // Insert message
    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, project_id, message)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, receiver_id, project_id, message]);

    // Get the sent message with sender info
    const sentMessage = await db.get(`
      SELECT m.*, 
             sender.name as sender_name, sender.role as sender_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      WHERE m.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      sentMessage
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

// Get conversations for current user
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    // Get all unique conversation partners
    const conversations = await db.all(`
      SELECT DISTINCT
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END as contact_id,
        u.name as contact_name,
        u.role as contact_role,
        u.profile_image as contact_image,
        MAX(m.sent_at) as last_message_time,
        (SELECT message FROM messages 
         WHERE (sender_id = ? AND receiver_id = contact_id) 
            OR (sender_id = contact_id AND receiver_id = ?)
         ORDER BY sent_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM messages 
         WHERE sender_id = contact_id AND receiver_id = ? AND read_status = 0) as unread_count
      FROM messages m
      JOIN users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id 
        ELSE m.sender_id 
      END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY contact_id, u.name, u.role, u.profile_image
      ORDER BY last_message_time DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);

    res.json({
      success: true,
      conversations
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

// Get messages between current user and another user
router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Get messages between the two users
    const messages = await db.all(`
      SELECT m.*, 
             sender.name as sender_name, sender.role as sender_role,
             receiver.name as receiver_name, receiver.role as receiver_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) 
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.sent_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, otherUserId, otherUserId, req.user.id, parseInt(limit), offset]);

    // Mark messages as read
    await db.run(`
      UPDATE messages 
      SET read_status = 1 
      WHERE sender_id = ? AND receiver_id = ? AND read_status = 0
    `, [otherUserId, req.user.id]);

    // Get other user info
    const otherUser = await db.get(`
      SELECT id, name, role, profile_image 
      FROM users WHERE id = ?
    `, [otherUserId]);

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      otherUser,
      pagination: {
        currentPage: parseInt(page),
        hasNextPage: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
});

// Send message with attachment
router.post('/send-with-attachment', authMiddleware, setUploadType('documents'), upload.single('attachment'), async (req, res) => {
  try {
    const { receiver_id, project_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID and message content are required'
      });
    }

    let attachmentPath = null;
    if (req.file) {
      attachmentPath = `/uploads/documents/${req.file.filename}`;
    }

    // Verify receiver exists
    const receiver = await db.get('SELECT id FROM users WHERE id = ?', [receiver_id]);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    // Insert message
    const result = await db.run(`
      INSERT INTO messages (sender_id, receiver_id, project_id, message, attachment_path)
      VALUES (?, ?, ?, ?, ?)
    `, [req.user.id, receiver_id, project_id, message, attachmentPath]);

    // Get the sent message with sender info
    const sentMessage = await db.get(`
      SELECT m.*, 
             sender.name as sender_name, sender.role as sender_role
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      WHERE m.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Message with attachment sent successfully',
      sentMessage
    });
  } catch (error) {
    console.error('Send message with attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message with attachment',
      error: error.message
    });
  }
});

// Get unread message count
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await db.get(`
      SELECT COUNT(*) as unread_count
      FROM messages 
      WHERE receiver_id = ? AND read_status = 0
    `, [req.user.id]);

    res.json({
      success: true,
      unreadCount: result.unread_count || 0
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
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const messageId = req.params.id;

    // Verify message belongs to current user as receiver
    const message = await db.get(`
      SELECT * FROM messages 
      WHERE id = ? AND receiver_id = ?
    `, [messageId, req.user.id]);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await db.run(`
      UPDATE messages 
      SET read_status = 1 
      WHERE id = ?
    `, [messageId]);

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