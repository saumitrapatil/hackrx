
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../database/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, name, phone, location, company_name, company_description } = req.body;

        // Validate required fields
        if (!email || !password || !role || !name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, role, and name are required'
            });
        }

        // Check if user already exists
        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const result = await dbRun(`
            INSERT INTO users (email, password, role, name, phone, location, company_name, company_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [email, hashedPassword, role, name, phone, location, company_name, company_description]);

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.id, email, role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: result.id,
                    email,
                    role,
                    name,
                    phone,
                    location
                },
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const user = await dbGet(`
            SELECT id, email, password, role, name, phone, location, company_name, company_description
            FROM users WHERE email = ?
        `, [email]);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: {
            user: req.user
        }
    });
});

// Mock OTP verification (for demo purposes)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // In a real app, you would verify the OTP against stored value
        // For demo, we'll accept any 6-digit number
        if (!otp || otp.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP format'
            });
        }

        // Update user verification status
        await dbRun(
            'UPDATE users SET verification_status = ? WHERE email = ?',
            ['verified', email]
        );

        res.json({
            success: true,
            message: 'Phone/Email verified successfully'
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'OTP verification failed',
            error: error.message
        });
    }
});

module.exports = router;