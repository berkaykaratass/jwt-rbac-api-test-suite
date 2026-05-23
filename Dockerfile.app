# =============================================================================
# Dockerfile for the System Under Test (SUT)
# Clones and builds the BezKoder Node.js JWT Auth + Tutorial CRUD API
# =============================================================================
# NOTE: This Dockerfile clones the application source code at build time.
# The original source code is NOT included in our test repository.
# =============================================================================

FROM node:18-alpine

WORKDIR /usr/src/app

# Install git for cloning the repository
RUN apk add --no-cache git

# Clone the JWT Refresh Token repository
RUN git clone https://github.com/bezkoder/jwt-refresh-token-node-js-mongodb.git auth-app

WORKDIR /usr/src/app/auth-app

# Install dependencies
RUN npm install

# Copy our custom server configuration that combines auth + tutorials
COPY sut-config/server.js ./server.js
COPY sut-config/db.config.js ./app/config/db.config.js
COPY sut-config/tutorial.model.js ./app/models/tutorial.model.js
COPY sut-config/tutorial.controller.js ./app/controllers/tutorial.controller.js
COPY sut-config/tutorial.routes.js ./app/routes/tutorial.routes.js

# Expose the API port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
