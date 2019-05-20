import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: bnode02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT (BNODE() AS ?b1) (BNODE() AS ?b2)
 * WHERE {}
 */

/**
 * Manifest Entry
 * :bnode02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "BNODE()" ;
 *   mf:feature sparql:bnode ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <bnode02.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <bnode02.srx> ;
 *   .
 */

// This does of course not correspond to the actual spec test.
describe('We should respect the bnode02 spec', () => {
  testAll([
    `BNODE("test") != BNODE("a") = ${a.true}`,
  ]);
});

/**
 * RESULTS: bnode02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="b1"/>
 *   <variable name="b2"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="b1"><bnode>b0</bnode></binding>
 *       <binding name="b2"><bnode>b1</bnode></binding>
 *     </result>
 * </results>
 * </sparql>
 *
 */
