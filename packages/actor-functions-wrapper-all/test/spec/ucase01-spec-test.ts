import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: ucase01.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT ?s (UCASE(?str) AS ?ustr) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :ucase01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "UCASE()" ;
 *   mf:feature sparql:ucase ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <ucase01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <ucase01.srx> ;
 *   .
 */

describe('We should respect the ucase01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  runTestTable({
    operation: 'UCASE',
    notation: Notation.Function,
    arity: 1,
    testTable: `
      '${s1}' = "FOO"
      '${s2}' = "BAR"@en
      '${s3}' = "BAZ"
      '${s4}' = "食べ物"
      '${s5}' = "100%"
      '${s6}' = "ABC"^^xsd:string
      '${s7}' = "DEF"^^xsd:string
    `,
  });
});

/**
 * RESULTS: ucase01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="ustr"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="ustr"><literal xml:lang="en">BAR</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="ustr"><literal>食べ物</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *       <binding name="ustr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">DEF</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="ustr"><literal>BAZ</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="ustr"><literal>100%</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="ustr"><literal datatype="http://www.w3.org/2001/XMLSchema#string">ABC</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="ustr"><literal>FOO</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
