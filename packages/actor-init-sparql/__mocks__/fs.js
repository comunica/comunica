const testFileContentDict = {
  "@context": {
    "foaf": "http://xmlns.com/foaf/0.1/",
    // tslint:disable-next-line:object-literal-sort-keys
    "@base": "http://example.com/my-ontology#",
    "dbpedia": "http://dbpedia.org/resource/",
    "dbpprop": "http://dbpedia.org/property/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
  },
  "@graph": [
    {
      "@id": "joachimvh",
      "rdfs:label": { "@value": "Joachim Van Herwegen", "@language": "en"},
      // tslint:disable-next-line:object-literal-sort-keys
      "dbpprop:occupation": { "@id": "dbpedia:Computer_scientist"},
    },
    {
      "@id": "http://www.rubensworks.net/#me",
      "rdfs:label": { "@value": "Ruben Taelman", "@language": "en"},
      // tslint:disable-next-line:object-literal-sort-keys
      "dbpprop:occupation": { "@id": "dbpedia:Computer_scientist"},
    },
    {
      "@id": "dbpedia:IMEC",
      "foaf:member": [
        { "@id": "joachimvh" },
        { "@id": "http://www.rubensworks.net/#me" },
      ],
    },
  ],
};
const testArgumentDict = { sources: [{ type: "file", value : "example" }]};

const fs = jest.genMockFromModule('fs');
fs.existsSync = jest.fn(() => true);
fs.readFileSync = jest.fn(() => JSON.stringify(testFileContentDict));

module.exports = {
  fs,
  testFileContentDict,
  testArgumentDict,
};
