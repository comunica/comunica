import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: strafter02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT
 *   ?s
 *   ?str
 *   (STRAFTER(?str,"b") AS ?ab)
 *   (STRAFTER(?str,"ab") AS ?aab)
 *   (STRAFTER(?str,"b"@cy) AS ?abcy)
 *   (STRAFTER(?str,"") AS ?a)
 *   (STRAFTER(?str,""@en) AS ?aen)
 *   (STRAFTER(?str,"b"^^xsd:string) AS ?abx)
 *   (STRAFTER(?str,"xyz"^^xsd:string) AS ?axyzx)
 * WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :strafter02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRAFTER() datatyping" ;
 *   mf:feature sparql:strafter ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <strafter02.rq> ;
 *            qt:data   <data4.ttl> ] ;
 *     mf:result  <strafter02.srx> ;
 *   .
 */

describe('We should respect the strafter02 spec', () => {
  const { s1, s2, s3 } = Data.data4();
  runTestTable({
    arity: 2,
    notation: Notation.Function,
    operation: 'STRAFTER',
    testTable: `
      '${s1}' "b" = "c"
      '${s1}' "ab" = "c"
      '${s1}' "" = "abc"
      '${s1}' "b"^^xsd:string = "c"
      '${s1}' "xyz"^^xsd:string = ""
  
      '${s2}' "b" = "c"@en
      '${s2}' "ab" = "c"@en
      '${s2}' "" = "abc"@en
      '${s2}' ""@en = "abc"@en
      '${s2}' "b"^^xsd:string = "c"@en
      '${s2}' "xyz"^^xsd:string = ""
  
      '${s3}' "b" = "c"^^xsd:string
      '${s3}' "ab" = "c"^^xsd:string
      '${s3}' "" = "abc"^^xsd:string
      '${s3}' "b"^^xsd:string = "c"^^xsd:string
      '${s3}' "xyz"^^xsd:string = ""^^xsd:string
    `,
    errorTable: `
      '${s1}' "b"@cy = ''
      '${s1}' ""@en  = ''
  
      '${s2}' "b"@cy = ''
  
      '${s3}' ""@en  = ''
      '${s3}' "b"@cy = ''
    `,
  });
});

/**
 * RESULTS: strafter02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 *   <variable name="ab"/>
 *   <variable name="aab"/>
 *   <variable name="abcy"/>
 *   <variable name="a"/>
 *   <variable name="aen"/>
 *   <variable name="abx"/>
 *   <variable name="axyzx"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>abc</literal></binding>
 *       <binding name="ab"><literal>c</literal></binding>
 *       <binding name="aab"><literal>c</literal></binding>
 *       <binding name="a"><literal>abc</literal></binding>
 *       <binding name="abx"><literal>c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="ab"><literal xml:lang="en">c</literal></binding>
 *       <binding name="aab"><literal xml:lang="en">c</literal></binding>
 *       <binding name="a"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="aen"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="abx"><literal xml:lang="en">c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="ab"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="aab"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="a"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="abx"><literal datatype="http://www.w3.org/2001/XMLSchema#string">c</literal></binding>
 *       <binding name="axyzx"><literal></literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
