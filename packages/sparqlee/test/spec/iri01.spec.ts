import { testAll } from '../util/utils';

describe('We should respect the iri01 spec', () => {
  testAll([
    'URI("uri") = http://example.org/uri',
    'IRI("iri") = http://example.org/iri',
  ], { type: 'sync', config: { baseIRI: 'http://example.org' }});
});

/**
 * RESULTS: iri01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="iri"/>
 *   <variable name="uri"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="uri"><uri>http://example.org/uri</uri></binding>
 *       <binding name="iri"><uri>http://example.org/iri</uri></binding>
 *     </result>
 * </results>
 * </sparql>
 *
 */
