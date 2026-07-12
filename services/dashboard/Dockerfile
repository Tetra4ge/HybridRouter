# Build Stage
FROM node:20-slim AS builder
WORKDIR /app

# Accept Gemini API key as build arg (pass via --build-arg or docker-compose args)
# This is safe — the key never touches source control
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy code and build
COPY . .
RUN npm run build

# Serve Stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
