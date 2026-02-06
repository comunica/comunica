const testFileContentDict = {
  '@context': {
    foaf: 'http://xmlns.com/foaf/0.1/',

    '@base': 'http://example.com/my-ontology#',
    dbpedia: 'http://dbpedia.org/resource/',
    dbpprop: 'http://dbpedia.org/property/',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  },
  '@graph': [
    {
      '@id': 'joachimvh',
      'rdfs:label': { '@value': 'Joachim Van Herwegen', '@language': 'en' },

      'dbpprop:occupation': { '@id': 'dbpedia:Computer_scientist' },
    },
    {
      '@id': 'http://www.rubensworks.net/#me',
      'rdfs:label': { '@value': 'Ruben Taelman', '@language': 'en' },

      'dbpprop:occupation': { '@id': 'dbpedia:Computer_scientist' },
    },
    {
      '@id': 'dbpedia:IMEC',
      'foaf:member': [
        { '@id': 'joachimvh' },
        { '@id': 'http://www.rubensworks.net/#me' },
      ],
    },
  ],
};

const testArgumentDict = { sources: [{ type: 'file', value: 'example' }]};

const fs = jest.createMockFromModule('fs');
const actualFs = jest.requireActual('fs');

// eslint-disable-next-line no-sync
fs.existsSync = jest.fn(() => true);
// eslint-disable-next-line no-sync
fs.readFileSync = jest.fn((path) => {
  if (path.includes('sparql-endpoint.html')) {
    // Use actual fs to read the real HTML file
    // eslint-disable-next-line no-sync
    return actualFs.readFileSync(path, 'utf8');
  }
  return JSON.stringify(testFileContentDict);
});

// Add promises support for async file reading
fs.promises = {
  readFile: jest.fn((path, _encoding) => {
    if (path.includes('sparql-endpoint.html')) {
      // Use actual fs to read the real HTML file
      return actualFs.promises.readFile(path, 'utf8');
    }
    return Promise.resolve(JSON.stringify(testFileContentDict));
  }),
};

module.exports = {
  fs,
  testFileContentDict,
  testArgumentDict,
};
