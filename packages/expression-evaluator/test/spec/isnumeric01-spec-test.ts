import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

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
  runTestTable({
    aliases: bool,
    operation: 'isNumeric',
    notation: Notation.Function,
    arity: 1,
    testTable: `
    '${n1}' = true
    '${n2}' = true
    '${n3}' = true
    '${n4}' = true
    '${n5}' = true

    '${s1}' = false
    '${s2}' = false
    '${s3}' = false
    '${s4}' = false
    '${s5}' = false
    '${s6}' = false
    '${s7}' = false

    '${d1}' = false
    '${d2}' = false
    '${d3}' = false
    '${d4}' = false
    `,
  });
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
