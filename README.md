# GameRate - Full Stack Game Rating Platform

A modern web application for rating and reviewing games, built with a Node.js backend and vanilla JavaScript frontend.

## Features

- **User Authentication**: Sign up, login, and account management
- **Game Management**: Add, edit, and delete games (admin only)
- **Rating System**: 1-5 star rating system with written reviews
- **Review System**: Leave reviews and replies on games
- **File Upload**: Upload game cover images
- **Responsive Design**: Modern, mobile-friendly UI
- **Real-time Updates**: Dynamic content loading

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Express Rate Limit** for API protection
- **Helmet** for security headers

### Frontend
- **Vanilla JavaScript** (ES6+)
- **CSS3** with modern features
- **Fetch API** for HTTP requests
- **Local Storage** for token management

## Project Structure

```
├── server/                 # Backend code
│   ├── routes/            # API route handlers
│   ├── middleware/        # Custom middleware
│   ├── database.js        # Database connection and setup
│   ├── config.js          # Configuration settings
│   └── server.js          # Main server file
├── *.html                 # Frontend pages
├── styles.css             # Frontend styles
├── api-client.js          # API client library
├── app-api.js             # Frontend application logic
└── package.json           # Frontend dependencies
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. **Navigate to the server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

   The server will start on `http://localhost:3001`

### Frontend Setup

1. **Open the frontend files in a web server:**
   
   **Option 1: Using Python (if installed):**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option 2: Using Node.js http-server:**
   ```bash
   npx http-server -p 8000
   ```
   
   **Option 3: Using Live Server (VS Code extension):**
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

2. **Access the application:**
   - Frontend: `http://localhost:8000`
   - Backend API: `http://localhost:3001/api`

## Default Admin Account

- **Email:** admin@example.com
- **Password:** admin123

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/account` - Update account
- `POST /api/auth/logout` - User logout

### Games
- `GET /api/games` - List all games
- `GET /api/games/:id` - Get single game
- `POST /api/games` - Add new game (admin)
- `PUT /api/games/:id` - Update game (admin)
- `DELETE /api/games/:id` - Delete game (admin)
- `GET /api/games/search/:query` - Search games

### Reviews
- `GET /api/reviews/game/:gameId` - Get reviews for game
- `POST /api/reviews/game/:gameId` - Add review
- `PUT /api/reviews/:reviewId` - Update review
- `DELETE /api/reviews/:reviewId` - Delete review
- `POST /api/reviews/:reviewId/replies` - Add reply
- `PUT /api/reviews/replies/:replyId` - Update reply
- `DELETE /api/reviews/replies/:replyId` - Delete reply

## Configuration

### Environment Variables
Create a `.env` file in the server directory:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
USE_MONGO=true
MONGODB_URI=mongodb://localhost:27017/gamerate
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Database
The application uses MongoDB for data storage. Ensure MongoDB is running and accessible.

## Development

### Adding New Features
1. Backend: Add routes in `server/routes/`
2. Frontend: Update `api-client.js` and `app-api.js`
3. Database: Modify `server/database.js` for schema changes

### File Structure
- Keep backend and frontend separate
- Use consistent naming conventions
- Add proper error handling
- Include input validation

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Security headers with Helmet
- File upload restrictions

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure the backend is running on port 3001
   - Check CORS configuration in `server.js`

2. **Database Errors:**
   - Delete `database.sqlite` to reset the database
   - Check file permissions in the server directory

3. **File Upload Issues:**
   - Ensure the `uploads` directory exists
   - Check file size limits
   - Verify file type restrictions

4. **Authentication Issues:**
   - Clear browser localStorage
   - Check JWT secret configuration
   - Verify token expiration

### Logs
Check the server console for detailed error messages and logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

