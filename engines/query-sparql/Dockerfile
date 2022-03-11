FROM node:16

# Install location
ENV dir /home/comunica/

# Create user
RUN useradd --create-home --shell /bin/bash comunica
USER comunica
WORKDIR ${dir}

# Debug
RUN ls -al ${dir}
RUN whoami

# Copy the engine files (generated from package.json!files)
COPY config ${dir}/config/
COPY lib/*.js ${dir}/lib/
COPY bin/*.js ${dir}/bin/
COPY engine-default.js package.json ${dir}

# Set the npm registry
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set @comunica:registry $NPM_REGISTRY

# Install the node module
RUN cd ${dir} && npm install --only=production

# Run base binary (generated from package.json!bin)
ENTRYPOINT ["node", "./bin/query.js"]

# Default command
CMD ["--help"]
