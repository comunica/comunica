FROM node:10

# Install location
ENV dir /var/www/@comunica/actor-init-sparql/

# Run base binary (generated from package.json!bin)
WORKDIR ${dir}

RUN npm install -g @comunica/actor-init-sparql

ENTRYPOINT ["comunica-sparql"]

# Default command
CMD ["--help"]