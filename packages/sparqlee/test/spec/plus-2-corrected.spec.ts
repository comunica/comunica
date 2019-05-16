import * as Data from './_data';

import { aliases as a, decimal, int, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: plus-2-corrected.rq
 *
 * PREFIX  : <http://example/>
 *
 * SELECT  ?x ?y ( str(?x) + str(?y) AS ?sum)
 * WHERE
 *     { ?s :p ?x ; :q ?y .
 *     }
 */

/**
 * Manifest Entry
 * :plus-2-corrected a mf:QueryEvaluationTest ;
 *     mf:name    "plus-2-corrected" ;
 *     rdfs:comment  "plus operator in combination with str(), i.e.  str(?x) + str(?y), on string and numeric values" ;
 *     dawgt:approval dawgt:Proposed ;
 *     mf:action
 *        [ qt:query  <plus-2-corrected.rq> ;
 *    qt:data   <data-builtin-3.ttl> ] ;
 *     mf:result  <plus-2.srx> ;
 *     .
 */

describe('We should respect the plus-2-corrected spec', () => {
  const {
    x1p, x1q,
    x2q,
    x3q,
    x4p, x4q,
    x5p, x5q,
    x6p, x6q,
    x7p, x7q,
    x8p, x8q,
  } = Data.dataBuiltin3();

  testAllErrors([
    `str(${x1p})             + str(${x1q}) = error`,
    `str(BNODE())            + str(${x2q}) = error`,
    `str(<http://example/a>) + str(${x3q}) = error`,
    `str(${x4p})             + str(${x4q}) = error`,
    `str(${x5p})             + str(${x5q}) = error`,
    `str(${x6p})             + str(${x6q}) = error`,
    `str(${x7p})             + str(${x7q}) = error`,
    `str(${x8p})             + str(${x8q}) = error`,
  ]);
});

/**
 * RESULTS: plus-2-corrected.srx
 *
 * <?xml version="1.0"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="x"/>
 *     <variable name="y"/>
 *     <variable name="sum"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="x">
 *         <bnode>b0</bnode>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <uri>http://example/a</uri>
 *       </binding>
 *       <binding name="y">
 *         <literal>1</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal>1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal>2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">1</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#decimal">1.0</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="x">
 *         <literal>a</literal>
 *       </binding>
 *       <binding name="y">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">1</literal>
 *       </binding>
 *     </result>
 *   </results>
 * </sparql>
 */
