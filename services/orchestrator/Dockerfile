FROM node:20-slim

WORKDIR /app

# Install dependency files first to cache layers
COPY package.json package-lock.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Ensure input/output and data directories exist
RUN mkdir -p /input /output /app/data/logs /app/data/cache

# Expose port for development/dashboard mode
EXPOSE 3000

# Default to running the headless batch processor for hackathon evaluation
CMD ["node", "main.js"]
