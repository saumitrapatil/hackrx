
## 📊 Database

The application uses SQLite database that is automatically created and initialized with sample data on first run.

**Database file location**: `backend/database/estate.db`

### Sample Users
- **Admin**: admin@premiumestate.com (password: password123)
- **Client**: john.client@email.com (password: password123)
- **Developer**: luxury.developments@email.com (password: password123)
- **Broker**: sarah.broker@email.com (password: password123)

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/verify-otp` - Verify OTP (mock)

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload avatar
- `GET /api/users/developers` - Get all developers
- `GET /api/users/developers/:id/portfolio` - Get developer portfolio
- `POST /api/users/kyc-verification` - Upload KYC document

### Properties
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Create property (developer only)
- `PUT /api/properties/:id` - Update property (developer only)
- `POST /api/properties/:id/images` - Upload property images
- `GET /api/properties/recommendations/:clientId` - Get recommendations

### Projects
- `POST /api/projects/initiate` - Create project inquiry
- `GET /api/projects/my-projects` - Get user's projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id/status` - Update project status
- `PUT /api/projects/:id/milestone` - Update project timeline
- `PUT /api/projects/:id/assign-broker` - Assign broker

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `GET /api/messages/project/:projectId` - Get project messages
- `GET /api/messages/unread/count` - Get unread count
- `PUT /api/messages/:messageId/read` - Mark as read

## 📁 File Structure