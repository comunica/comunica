import * as Data from './_data';

import { aliases as a, decimal, int, testAll, testAllErrors } from '../util/utils';

/**
 * REQUEST: coalesce01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT
 *   (COALESCE(?x, -1) AS ?cx)     # error when ?x is unbound -> -1
 *   (COALESCE(?o/?x, -2) AS ?div) # error when ?x is unbound or zero -> -2
 *   (COALESCE(?z, -3) AS ?def)    # always unbound -> -3
 *   (COALESCE(?z) AS ?err)        # always an error -> unbound
 * WHERE {
 *   ?s :p ?o .
 *   OPTIONAL {
 *     ?s :q ?x
 *   }
 * }
 */

/**
 * Manifest Entry
 * :coalesce01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "COALESCE()" ;
 *   mf:feature sparql:coalesce ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <coalesce01.rq> ;
 *            qt:data   <data-coalesce.ttl> ] ;
 *     mf:result  <coalesce01.srx> ;
 *   .
 */

// # numeric data
// :n0 :p 1 .
// :n1 :p 0 ; :q 0 .
// :n2 :p 0 ; :q 2 .
// :n3 :p 4 ; :q 2 .

describe('We should respect the coalesce01 spec', () => {
  const { n0, q0, n1, n2, n3, q1, q2, q3 } = {
    n0: int('1'),
    q0: '?unbound',
    n1: int('0'),
    q1: int('0'),
    q2: int('2'),
    q3: int('2'),
    n2: int('0'),
    n3: int('4'),
  };

  testAll([
    // :n0
    `COALESCE(${q0}, -1) = ${int('-1')}`,
    `COALESCE(${n0}/${q0}, -2) = ${int('-2')}`,
    `COALESCE(?z, -3) = ${int('-3')}`,

    // :n1
    `COALESCE(${q1}, -1) = ${q1}`,
    `COALESCE(${n1}/${q1}, -2) = ${int('-2')}`,
    `COALESCE(?z, -3) = ${int('-3')}`,

    // :n2
    `COALESCE(${q2}, -1) = ${q2}`,
    `COALESCE(${n2}/${q2}, -2) = ${decimal('0')}`,
    `COALESCE(?z, -3) = ${int('-3')}`,

    // :n3
    `COALESCE(${q3}, -1) = ${q3}`,
    `COALESCE(${n3}/${q3}) = ${decimal('2')}`,
    `COALESCE(?z, -3) = ${int('-3')}`,
  ]);

  testAllErrors([
    'COALESCE(?z) = error',
  ]);
});

/**
 * RESULTS: coalesce01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="cx"/>
 *   <variable name="div"/>
 *   <variable name="def"/>
 *   <variable name="err"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="cx"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-1</literal></binding>
 *       <binding name="div"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *       <binding name="def"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="cx"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">0</literal></binding>
 *       <binding name="div"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-2</literal></binding>
 *       <binding name="def"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="cx"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
 *       <binding name="div"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">0.0</literal></binding>
 *       <binding name="def"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-3</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="cx"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">2</literal></binding>
 *       <binding name="div"><literal datatype="http://www.w3.org/2001/XMLSchema#decimal">2.0</literal></binding>
 *       <binding name="def"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">-3</literal></binding>
 *     </result>
 * </results>
 * </sparql>
 *
 */
