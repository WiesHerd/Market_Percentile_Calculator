FROM node:20-alpine

# Install dependencies required for development
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with cache optimization
RUN npm ci --prefer-offline --no-audit

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Set environment variables for development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=true
ENV NEXT_WEBPACK_USEPOLLING=true

# Increase Node.js memory limit but not too high to avoid container issues
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Start the application in development mode
CMD ["sh", "-c", "npm run dev"] 