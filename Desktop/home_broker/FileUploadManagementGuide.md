
## 📤 File Uploads

The API supports file uploads for:
- Property images
- User avatars
- Documents/attachments

Files are stored locally in the `uploads/` directory and served as static files.

## 🛠️ Features

- **Role-based Access Control**: Client, Developer, Broker, Admin roles
- **Property Management**: CRUD operations with image uploads
- **Project Tracking**: Inquiry to completion lifecycle
- **Real-time Messaging**: Chat system with file attachments
- **Search & Filtering**: Advanced property search
- **Recommendations**: AI-powered property suggestions
- **File Management**: Local file storage and serving

## 🔧 Configuration

Environment variables in `.env`:
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: JWT signing secret
- `NODE_ENV`: Environment (development/production)

## 📋 Development

### Adding New Routes
1. Create route file in `routes/` directory
2. Import and use in `server.js`
3. Add authentication middleware if needed

### Database Changes
1. Modify table creation in `database/init.js`
2. Delete `estate.db` file to recreate database
3. Restart server to apply changes

### File Upload Types
Modify `middleware/upload.js` to add new file types or change upload destinations.

## 🚨 Error Handling

All routes include comprehensive error handling with:
- Input validation
- Database error handling
- Authentication errors
- File upload errors
- Proper HTTP status codes

## 📈 Performance

- SQLite database for fast local development
- File uploads stored locally
- JWT tokens for stateless authentication
- Efficient query patterns with proper indexing

## 🔒 Security

- Password hashing with bcryptjs
- JWT token authentication
- Input validation and sanitization
- File upload restrictions
- CORS configuration
- SQL injection prevention with parameterized queries