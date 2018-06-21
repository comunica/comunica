FROM node:10

# Install location
ENV dir /var/www/@comunica/actor-init-sparql/

# Copy the engine files (generated from package.json!files)
COPY components ${dir}/components/
COPY config ${dir}/config/
COPY lib/*.js ${dir}/lib/
COPY bin/*.js ${dir}/bin/
COPY index.js index-browser.js engine-default.js package.json ${dir}

# Install the node module
RUN cd ${dir} && npm install --only=production

# Run base binary (generated from package.json!bin)
WORKDIR ${dir}
ENTRYPOINT ["node", "./bin/query.js"]

# Default command
CMD ["--help"]
