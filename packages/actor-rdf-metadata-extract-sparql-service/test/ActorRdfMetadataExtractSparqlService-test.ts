import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfMetadataExtractSparqlService } from '../lib/ActorRdfMetadataExtractSparqlService';

const streamifyArray = require('streamify-array');

const DF = new DataFactory();

describe('ActorRdfMetadataExtractSparqlService', () => {
  let bus: any;
  let context: IActionContext;
  let actor: ActorRdfMetadataExtractSparqlService;

  const requestTime = 0;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('test', () => {
    beforeEach(() => {
      actor = new ActorRdfMetadataExtractSparqlService({ name: 'actor', bus, inferHttpsEndpoint: false });
    });

    it('should test successfully', async() => {
      await expect(actor.test({ url: 'http://example.org/', metadata: <any> undefined, requestTime, context })).resolves.toBeTruthy();
    });
  });

  describe('run', () => {
    const sparqlIri = DF.namedNode('http://example.org/sparql');
    const sparqlService = DF.namedNode('http://example.org/endpoint');
    const sparqlDefaultDataset = DF.namedNode('http://example.org/dataset');
    const sparqlDefaultGraph = DF.namedNode('http://example.org/graph');
    const sparqlResultsJson = DF.namedNode('http://www.w3.org/ns/formats/SPARQL_Results_JSON');
    const sparqlResultsXml = DF.namedNode('http://www.w3.org/ns/formats/SPARQL_Results_XML');
    const sparql11Query = DF.namedNode('http://www.w3.org/ns/sparql-service-description#SPARQL11Query');

    const serviceDescriptionFeature = DF.namedNode('http://www.w3.org/ns/sparql-service-description#feature');
    const serviceDescriptionEndpoint = DF.namedNode('http://www.w3.org/ns/sparql-service-description#endpoint');
    const serviceDescriptionInputFormat = DF.namedNode('http://www.w3.org/ns/sparql-service-description#inputFormat');
    const serviceDescriptionResultFormat = DF.namedNode('http://www.w3.org/ns/sparql-service-description#resultFormat');
    const serviceDescriptionSupportedLanguage = DF.namedNode('http://www.w3.org/ns/sparql-service-description#supportedLanguage');
    const serviceDescriptionDefaultDataset = DF.namedNode('http://www.w3.org/ns/sparql-service-description#defaultDataset');
    const serviceDescriptionDefaultGraph = DF.namedNode('http://www.w3.org/ns/sparql-service-description#defaultGraph');
    const serviceDescriptionBasicFederatedQuery = DF.namedNode('http://www.w3.org/ns/sparql-service-description#BasicFederatedQuery');
    const serviceDescriptionUnionDefaultGraph = DF.namedNode('http://www.w3.org/ns/sparql-service-description#UnionDefaultGraph');

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractSparqlService({ name: 'actor', bus, inferHttpsEndpoint: false });
    });

    it.each([
      [ 'iri', sparqlIri ],
      [ 'blank node', DF.blankNode() ],
    ])('should parse service description when available with %s', async(type, serviceDescriptionIri) => {
      const input = streamifyArray([
        DF.quad(serviceDescriptionIri, serviceDescriptionEndpoint, sparqlService),
        DF.quad(serviceDescriptionIri, serviceDescriptionFeature, serviceDescriptionBasicFederatedQuery),
        DF.quad(serviceDescriptionIri, serviceDescriptionFeature, serviceDescriptionUnionDefaultGraph),
        DF.quad(serviceDescriptionIri, serviceDescriptionSupportedLanguage, sparql11Query),
        DF.quad(serviceDescriptionIri, serviceDescriptionInputFormat, sparqlResultsJson),
        DF.quad(serviceDescriptionIri, serviceDescriptionResultFormat, sparqlResultsXml),
        DF.quad(serviceDescriptionIri, serviceDescriptionDefaultDataset, sparqlDefaultDataset),
        DF.quad(sparqlDefaultDataset, serviceDescriptionDefaultGraph, sparqlDefaultGraph),
      ]);
      await expect(actor.run({ url: sparqlIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: {
          sparqlService: sparqlService.value,
          basicFederatedQuery: true,
          unionDefaultGraph: true,
          defaultDataset: sparqlDefaultDataset.value,
          defaultGraph: sparqlDefaultGraph.value,
          inputFormats: [ sparqlResultsJson.value ],
          resultFormats: [ sparqlResultsXml.value ],
          supportedLanguages: [ sparql11Query.value ],
        },
      });
    });

    it('should parse relative endpoint from literal when available', async() => {
      const input = streamifyArray([ DF.quad(sparqlIri, serviceDescriptionEndpoint, DF.literal('/abc/../endpoint')) ]);
      await expect(actor.run({ url: sparqlIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: { sparqlService: sparqlService.value },
      });
    });

    it('should infer HTTPS endpoint when instructed to', async() => {
      actor = new ActorRdfMetadataExtractSparqlService({ name: 'actor', bus, inferHttpsEndpoint: true });
      const httpsIri = sparqlIri.value.replace(/^http:/u, 'https:');
      const input = streamifyArray([ DF.quad(DF.namedNode(httpsIri), serviceDescriptionEndpoint, sparqlService) ]);
      await expect(actor.run({ url: httpsIri, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: { sparqlService: sparqlService.value.replace(/^http:/u, 'https:') },
      });
    });

    it('should parse endpoint, defaultDataset and the correct defaultGraph when available', async() => {
      const input = streamifyArray([
        DF.quad(sparqlIri, serviceDescriptionEndpoint, sparqlService),
        DF.quad(sparqlIri, serviceDescriptionDefaultDataset, sparqlDefaultDataset),
        DF.quad(sparqlDefaultDataset, serviceDescriptionDefaultGraph, sparqlDefaultGraph),
        DF.quad(DF.namedNode('http://example.org/dataset2'), serviceDescriptionDefaultGraph, DF.namedNode('http://example.org/graph2')),
      ]);
      await expect(actor.run({ url: sparqlIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: {
          sparqlService: sparqlService.value,
          defaultDataset: sparqlDefaultDataset.value,
          defaultGraph: sparqlDefaultGraph.value,
        },
      });
    });

    it('should return empty result without endpoint defined', async() => {
      const input = streamifyArray([ DF.quad(sparqlIri, serviceDescriptionInputFormat, sparqlResultsJson) ]);
      await expect(actor.run({ url: sparqlIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: {},
      });
    });
  });
});
