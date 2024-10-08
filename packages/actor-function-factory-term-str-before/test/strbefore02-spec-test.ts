import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import * as Data from '@comunica/utils-expression-evaluator/test/spec/_data';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrBefore } from '../lib';

/**
 * REQUEST: strbefore02.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT
 *   ?s
 *   ?str
 *   (STRBEFORE(?str,"b") AS ?bb)
 *   (STRBEFORE(?str,"bc") AS ?bbc)
 *   (STRBEFORE(?str,"b"@cy) AS ?bbcy)
 *   (STRBEFORE(?str,"") AS ?b)
 *   (STRBEFORE(?str,""@en) AS ?ben)
 *   (STRBEFORE(?str,"b"^^xsd:string) AS ?bbx)
 *   (STRBEFORE(?str,"xyz"^^xsd:string) AS ?bxyzx)
 * WHERE {
 *   ?s :str ?str
 * }
 */

/**
 * Manifest Entry
 * :strbefore02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRBEFORE() datatyping" ;
 *   mf:feature sparql:strbefore ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <strbefore02.rq> ;
 *            qt:data   <data4.ttl> ] ;
 *     mf:result  <strbefore02.srx> ;
 *   .
 */

describe('We should respect the strbefore02 spec', () => {
  const { s1, s2, s3 } = Data.data4();
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrBefore(args),
    ],
    arity: 2,
    operation: 'STRBEFORE',
    notation: Notation.Function,
    testTable: `
      '${s1}' "b" = "a"
      '${s1}' "bc" = "a"
      '${s1}' "" = ""
      '${s1}' "b"^^xsd:string = "a"
      '${s1}' "xyz"^^xsd:string = ""
  
      '${s2}' "b" = "a"@en
      '${s2}' "bc" = "a"@en
      '${s2}' "" = ""@en
      '${s2}' ""@en = ""@en
      '${s2}' "b"^^xsd:string = "a"@en
      '${s2}' "xyz"^^xsd:string = ""
  
      '${s3}' "b" = "a"^^xsd:string
      '${s3}' "bc" = "a"^^xsd:string
      '${s3}' "" = ""^^xsd:string
      '${s3}' "b"^^xsd:string = "a"^^xsd:string
      '${s3}' "xyz"^^xsd:string = ""^^xsd:string
    `,
    errorTable: `
      '${s1}' "b"@cy = 'Argument types not valid for operator'
      '${s1}' ""@en  = 'Argument types not valid for operator'
  
      '${s2}' "b"@cy = 'incompatible language literals'
  
      '${s3}' ""@en  = 'Argument types not valid for operator'
      '${s3}' "b"@cy = 'Argument types not valid for operator'
    `,
  });
});

/**
 * RESULTS: strbefore02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="s"/>
 *   <variable name="str"/>
 *   <variable name="bb"/>
 *   <variable name="bbc"/>
 *   <variable name="bbcy"/>
 *   <variable name="b"/>
 *   <variable name="ben"/>
 *   <variable name="bbx"/>
 *   <variable name="bxyzx"/>
 * </head>
 * <results>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s1</uri></binding>
 *       <binding name="str"><literal>abc</literal></binding>
 *       <binding name="bb"><literal>a</literal></binding>
 *       <binding name="bbc"><literal>a</literal></binding>
 *       <binding name="b"><literal></literal></binding>
 *       <binding name="bbx"><literal>a</literal></binding>
 *       <binding name="bxyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s2</uri></binding>
 *       <binding name="str"><literal xml:lang="en">abc</literal></binding>
 *       <binding name="bb"><literal xml:lang="en">a</literal></binding>
 *       <binding name="bbc"><literal xml:lang="en">a</literal></binding>
 *       <binding name="b"><literal xml:lang="en"></literal></binding>
 *       <binding name="ben"><literal xml:lang="en"></literal></binding>
 *       <binding name="bbx"><literal xml:lang="en">a</literal></binding>
 *       <binding name="bxyzx"><literal></literal></binding>
 *     </result>
 *     <result>
 *       <binding name="s"><uri>http://example.org/s3</uri></binding>
 *       <binding name="str"><literal datatype="http://www.w3.org/2001/XMLSchema#string">abc</literal></binding>
 *       <binding name="bb"><literal datatype="http://www.w3.org/2001/XMLSchema#string">a</literal></binding>
 *       <binding name="bbc"><literal datatype="http://www.w3.org/2001/XMLSchema#string">a</literal></binding>
 *       <binding name="b"><literal datatype="http://www.w3.org/2001/XMLSchema#string"></literal></binding>
 *       <binding name="bbx"><literal datatype="http://www.w3.org/2001/XMLSchema#string">a</literal></binding>
 *       <binding name="bxyzx"><literal></literal></binding>
 *     </result>
 * </results>
 * </sparql>
 */
