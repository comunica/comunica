import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { streamifyArray } from 'streamify-array';
import { ActorRdfMetadataExtractSparqlService } from '../lib/ActorRdfMetadataExtractSparqlService';

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
      await expect(actor.test({ url: 'http://localhost/', metadata: <any> undefined, requestTime, context })).resolves.toBeTruthy();
    });
  });

  describe('run', () => {
    const voidSubset = DF.namedNode('http://rdfs.org/ns/void#subset');

    const endpointIri = DF.namedNode('http://localhost/sparql');
    const endpointService = DF.namedNode('http://localhost/endpoint');
    const endpointDefaultDataset = DF.namedNode('http://localhost/dataset');
    const endpointDefaultGraph = DF.namedNode('http://localhost/graph');
    const endpointExtensionFunction = DF.namedNode('http://localhost/function');

    const sparqlResultsJson = DF.namedNode('http://www.w3.org/ns/formats/SPARQL_Results_JSON');
    const sparqlResultsXml = DF.namedNode('http://www.w3.org/ns/formats/SPARQL_Results_XML');
    const sparql11Query = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}SPARQL11Query`);

    const propertyFeature = DF.namedNode('ex:propertyFeatureExample');

    const serviceDescriptionFeature = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}feature`);
    const serviceDescriptionEndpoint = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}endpoint`);
    const serviceDescriptionInputFormat = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}inputFormat`);
    const serviceDescriptionResultFormat = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}resultFormat`);
    const serviceDescriptionPropertyFeature = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}propertyFeature`);
    const serviceDescriptionSupportedLanguage = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}supportedLanguage`);
    const serviceDescriptionDefaultDataset = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}defaultDataset`);
    const serviceDescriptionDefaultGraph = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}defaultGraph`);
    const serviceDescriptionBasicFederatedQuery = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}BasicFederatedQuery`);
    const serviceDescriptionUnionDefaultGraph = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}UnionDefaultGraph`);
    const serviceDescriptionExtensionFunction = DF.namedNode(`${ActorRdfMetadataExtractSparqlService.SD}extensionFunction`);

    beforeEach(() => {
      actor = new ActorRdfMetadataExtractSparqlService({ name: 'actor', bus, inferHttpsEndpoint: false });
    });

    it.each([
      [ 'iri', endpointIri ],
      [ 'blank node', DF.blankNode() ],
    ])('should parse service description identified by %s', async(_, serviceDescriptionIri) => {
      const input = streamifyArray([
        DF.quad(serviceDescriptionIri, serviceDescriptionEndpoint, endpointService),
        DF.quad(serviceDescriptionIri, serviceDescriptionFeature, serviceDescriptionBasicFederatedQuery),
        DF.quad(serviceDescriptionIri, serviceDescriptionFeature, serviceDescriptionUnionDefaultGraph),
        DF.quad(serviceDescriptionIri, serviceDescriptionFeature, DF.namedNode('unknown')),
        DF.quad(serviceDescriptionIri, serviceDescriptionSupportedLanguage, sparql11Query),
        DF.quad(serviceDescriptionIri, serviceDescriptionPropertyFeature, propertyFeature),
        DF.quad(serviceDescriptionIri, serviceDescriptionInputFormat, sparqlResultsJson),
        DF.quad(serviceDescriptionIri, serviceDescriptionResultFormat, sparqlResultsXml),
        DF.quad(serviceDescriptionIri, serviceDescriptionDefaultDataset, endpointDefaultDataset),
        DF.quad(endpointDefaultDataset, serviceDescriptionDefaultGraph, endpointDefaultGraph),
        DF.quad(endpointDefaultDataset, serviceDescriptionExtensionFunction, endpointExtensionFunction),
      ]);
      await expect(actor.run({ url: endpointIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: {
          sparqlService: endpointService.value,
          basicFederatedQuery: true,
          unionDefaultGraph: true,
          defaultDataset: endpointDefaultDataset.value,
          defaultGraph: endpointDefaultGraph.value,
          inputFormats: [ sparqlResultsJson.value ],
          resultFormats: [ sparqlResultsXml.value ],
          supportedLanguages: [ sparql11Query.value ],
          extensionFunctions: [ endpointExtensionFunction.value ],
          propertyFeatures: [ propertyFeature.value ],
        },
      });
    });

    it('should parse sd:defaultGraph when available via QPF metadata graph', async() => {
      const qpfEndpointUri = DF.namedNode('http://localhost/qpf');
      const input = streamifyArray([
        DF.quad(endpointDefaultDataset, voidSubset, qpfEndpointUri),
        DF.quad(endpointDefaultDataset, serviceDescriptionDefaultGraph, endpointDefaultGraph),
      ]);
      await expect(actor.run({ url: qpfEndpointUri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: { defaultGraph: endpointDefaultGraph.value },
      });
    });

    it('should parse relative sd:endpoint from xsd:Literal when available', async() => {
      const input = streamifyArray([
        DF.quad(endpointIri, serviceDescriptionEndpoint, DF.literal('/abc/../endpoint')),
      ]);
      await expect(actor.run({ url: endpointIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: { sparqlService: endpointService.value },
      });
    });

    it('should force sd:endpoint to HTTPS when instructed to', async() => {
      actor = new ActorRdfMetadataExtractSparqlService({ name: 'actor', bus, inferHttpsEndpoint: true });
      const httpsIri = endpointIri.value.replace(/^http:/u, 'https:');
      const input = streamifyArray([
        DF.quad(DF.namedNode(httpsIri), serviceDescriptionEndpoint, endpointService),
      ]);
      await expect(actor.run({ url: httpsIri, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: { sparqlService: endpointService.value.replace(/^http:/u, 'https:') },
      });
    });

    it('should parse sd:endpoint, sd:defaultDataset and the correct sd:defaultGraph when available', async() => {
      const input = streamifyArray([
        DF.quad(endpointIri, serviceDescriptionEndpoint, endpointService),
        DF.quad(endpointIri, serviceDescriptionDefaultDataset, endpointDefaultDataset),
        DF.quad(endpointDefaultDataset, serviceDescriptionDefaultGraph, endpointDefaultGraph),
        DF.quad(DF.namedNode('http://example.org/dataset2'), serviceDescriptionDefaultGraph, DF.namedNode('http://example.org/graph2')),
      ]);
      await expect(actor.run({ url: endpointIri.value, metadata: input, context, requestTime })).resolves.toEqual({
        metadata: {
          sparqlService: endpointService.value,
          defaultDataset: endpointDefaultDataset.value,
          defaultGraph: endpointDefaultGraph.value,
        },
      });
    });
  });
});
