FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV MONGODB_URI=mongodb://mongo:27017/prg
ENV JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENV UPLOAD_DIR=./uploads
ENV MAX_FILE_SIZE=5242880

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the server
CMD ["npm", "start"]