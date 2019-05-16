import * as Data from './_data';

import { aliases as a, testAll } from '../util/utils';

/**
 * REQUEST: if01.rq
 *
 * BASE <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT ?o (IF(lang(?o) = "ja", true, false) AS ?integer)
 * WHERE {
 *   ?s ?p ?o
 * }
 */

/**
 * Manifest Entry
 * :if01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "IF()" ;
 *   mf:feature sparql:if ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <if01.rq> ;
 *            qt:data   <data2.ttl> ] ;
 *     mf:result  <if01.srx> ;
 *   .
 */

describe('We should respect the if01 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data2();
  testAll([
    `IF(lang(${s1}) = "ja", true, false) = ${a.false}`,
    `IF(lang(${s2}) = "ja", true, false) = ${a.true}`,
    `IF(lang(${s3}) = "ja", true, false) = ${a.false}`,
    `IF(lang(${s4}) = "ja", true, false) = ${a.false}`,
    `IF(lang(${s5}) = "ja", true, false) = ${a.false}`,
    `IF(lang(${s6}) = "ja", true, false) = ${a.false}`,
    `IF(lang(${s7}) = "ja", true, false) = ${a.false}`,
  ]);
});

/**
 * RESULTS: if01.srx
 *
 * <?xml version="1.0"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="o"/>
 *     <variable name="integer"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="o">
 *         <literal>123</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">def</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal xml:lang="fr">français</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal xml:lang="ja">日本語</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">true</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#integer">7</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *     <result>
 *       <binding name="o">
 *         <literal xml:lang="en">english</literal>
 *       </binding>
 *       <binding name="integer">
 *         <literal datatype="http://www.w3.org/2001/XMLSchema#boolean">false</literal>
 *       </binding>
 *     </result>
 *   </results>
 * </sparql>
 */
