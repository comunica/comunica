import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: ends01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?str WHERE {
 *   ?s ?p ?str
 *   FILTER STRENDS(?str, "bc")
 * }
 */

/**
 * Manifest Entry
 * :ends01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRENDS()" ;
 *   mf:feature sparql:strends ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <ends01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <ends01.srx> ;
 *   .
 */

describe('We should respect the ends01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  runTestTable({
    notation: Notation.Function,
    arity: 2,
    aliases: bool,
    operation: 'STRENDS',
    testTable: `
      '${s1}' "bc" = false
      '${s2}' "bc" = false
      '${s3}' "bc" = false
      '${s4}' "bc" = false
      '${s5}' "bc" = false
      '${s6}' "bc" = true
      '${s7}' "bc" = false
    `,
  });
});

/**
 * RESULTS: ends01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
