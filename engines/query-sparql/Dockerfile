FROM node:18

USER node

# Install location
WORKDIR /var/www/@comunica/query-sparql/

# Copy the engine files (generated from package.json!files)
COPY --chown=node:node config config/
COPY --chown=node:node lib/*.js lib/
COPY --chown=node:node bin/*.js bin/
COPY --chown=node:node engine-default.js package.json ./

# Set the npm registry
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set @comunica:registry $NPM_REGISTRY

# Install the node module
RUN echo $(whoami) && ls -al ./ && chown -R node:node /var/www/@comunica/query-sparql/
RUN echo $(whoami) && npm install --omit=dev

# Run base binary (generated from package.json!bin)
ENTRYPOINT ["node", "./bin/query.js"]

# Default command
CMD ["--help"]
