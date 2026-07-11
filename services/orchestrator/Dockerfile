FROM node:20

WORKDIR /app

# Install dependencies first for Docker caching
COPY package.json package-lock.json ./
RUN npm install --production

# Copy application code
COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data/logs

EXPOSE 3000

# Default command starts the web API for the dashboard
CMD ["npm", "run", "start"]
