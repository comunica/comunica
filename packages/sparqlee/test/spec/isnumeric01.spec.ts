import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: isnumeric01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s ?num WHERE {
 *   ?s ?p ?num
 *   FILTER isNumeric(?num)
 * }
 */

/**
 * Manifest Entry
 * :isnumeric01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "isNumeric()" ;
 *   mf:feature sparql:isnumeric ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <isnumeric01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <isnumeric01.srx> ;
 *   .
 */

describe('We should respect the isnumeric01 spec', () => {
  const { n1, n2, n3, n4, n5, s1, s2, s3, s4, s5, s6, s7, d1, d2, d3, d4 } = Data.data();
  testAll([
    `isNumeric(${n1}) = ${a.true}`,
    `isNumeric(${n2}) = ${a.true}`,
    `isNumeric(${n3}) = ${a.true}`,
    `isNumeric(${n4}) = ${a.true}`,
    `isNumeric(${n5}) = ${a.true}`,

    `isNumeric(${s1}) = ${a.false}`,
    `isNumeric(${s2}) = ${a.false}`,
    `isNumeric(${s3}) = ${a.false}`,
    `isNumeric(${s4}) = ${a.false}`,
    `isNumeric(${s5}) = ${a.false}`,
    `isNumeric(${s6}) = ${a.false}`,
    `isNumeric(${s7}) = ${a.false}`,

    `isNumeric(${d1}) = ${a.false}`,
    `isNumeric(${d2}) = ${a.false}`,
    `isNumeric(${d3}) = ${a.false}`,
    `isNumeric(${d4}) = ${a.false}`,
  ]);
});

/**
 * RESULTS: isnumeric01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="num"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n3</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n2</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">-1.6</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n1</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n5</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.5</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/n4</uri></binding>
 *       <binding name="num"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
