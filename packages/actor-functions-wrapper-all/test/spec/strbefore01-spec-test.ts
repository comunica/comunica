import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: strbefore01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?s (STRBEFORE(?str,"s") AS ?prefix) WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :strbefore01a rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRBEFORE()" ;
 *   mf:feature sparql:strbefore ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <strbefore01.rq> ;
 *            qt:data   <data2.ttl> ] ;
 *     mf:result  <strbefore01a.srx> ;
 *   .
 */

describe('We should respect the strbefore01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data2();
  runTestTable({
    arity: 2,
    operation: 'STRBEFORE',
    notation: Notation.Function,
    testTable: `
      '${s1}' "s" = ""
      '${s2}' "s" = ""
      '${s3}' "s" = "engli"@en
      '${s4}' "s" = "françai"@fr
      '${s5}' "s" = ""^^xsd:string
      '${s6}' "s" = ""^^xsd:string
    `,
    errorTable: `
      '${s7}' "s" = ''
    `,
  });
});

/**
 * RESULTS: strbefore01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="prefix"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="prefix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="prefix"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="prefix"><literal xml:lang="en">engli</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s4</uri></binding>
 *       <binding name="prefix"><literal xml:lang="fr">françai</literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s5</uri></binding>
 *       <binding name="prefix"><literal datatype="http://www.w3.org/2001/XMLSchema#string"></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s6</uri></binding>
 *       <binding name="prefix"><literal datatype="http://www.w3.org/2001/XMLSchema#string"></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s7</uri></binding>
 *     </result>
 * </results>
 * </sparql>
 */
