import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: iri01.rq
 *
 * BASE <http://example.org/>
 * SELECT (URI("uri") AS ?uri) (IRI("iri") AS ?iri)
 * WHERE {}
 */

/**
 * Manifest Entry
 * :iri01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "IRI()/URI()" ;
 *   mf:feature sparql:iri ;
 *   mf:feature sparql:uri ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <iri01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <iri01.srx> ;
 *   .
 */

describe('We should respect the iri01 spec', () => {
  const { } = Data.data();
  testAll([
    'URI("uri") = http://example.org/uri',
    'IRI("iri") = http://example.org/iri',
  ], { baseIRI: 'http://example.org' });
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
