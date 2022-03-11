FROM node:16

# Install location
WORKDIR /usr/src/app

# Run as default node user
RUN chown node:node ./
USER node

# Copy the engine files (generated from package.json!files)
COPY config ./config/
COPY lib/*.js ./lib/
COPY bin/*.js ./bin/
COPY engine-default.js package.json ./

# Set the npm registry
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set @comunica:registry $NPM_REGISTRY

# Install the node module
RUN npm install --only=production

# Run base binary (generated from package.json!bin)
ENTRYPOINT ["node", "./bin/query.js"]

# Default command
CMD ["--help"]
