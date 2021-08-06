import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: contains01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s ?str WHERE {
 *   ?s :str ?str
 *   FILTER CONTAINS(?str, "a")
 * }
 */

/**
 * Manifest Entry
 * :contains01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "CONTAINS()" ;
 *   mf:feature sparql:contains ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <contains01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <contains01.srx> ;
 *   .
 */

describe('We should respect the contains01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data();
  runTestTable({
    arity: 2,
    notation: Notation.Function,
    operation: 'CONTAINS',
    aliases: bool,
    testTable: `
    '${s1}' "a" = false
    '${s2}' "a" = true
    '${s3}' "a" = false
    '${s4}' "a" = false
    '${s5}' "a" = false
    '${s6}' "a" = true
    '${s7}' "a" = false
    `,
  });
});

/**
 * RESULTS: contains01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">bar</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
