# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the entire project first
COPY . .

# Change to server directory and install dependencies there
WORKDIR /app/server
RUN npm ci --only=production

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Expose the port that the app runs on
EXPOSE 3000

# Start the application (we're already in /app/server)
CMD ["npm", "start"]