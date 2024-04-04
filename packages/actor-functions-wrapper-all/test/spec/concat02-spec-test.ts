import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
import * as Data from './_data';

/**
 * REQUEST: concat02.rq
 *
 * PREFIX : <http://example.org/>
 * SELECT (CONCAT(?str1,?str2) AS ?str) WHERE {
 *   ?s1 :str ?str1 .
 *   ?s2 :str ?str2 .
 * }
 */

/**
 * Manifest Entry
 * :concat02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "CONCAT() 2" ;
 *   mf:feature sparql:concat ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <concat02.rq> ;
 *            qt:data   <data2.ttl> ] ;
 *     mf:result  <concat02.srx> ;
 *   .
 */

describe('We should respect the concat02 spec', () => {
  const { s1, s2, s3, s4, s5, s6, s7 } = Data.data2();
  runTestTable({
    arity: 2,
    notation: Notation.Function,
    operation: 'CONCAT',
    testTable: `
    '${s1}' '${s1}' = "123123"
    '${s1}' '${s2}' = "123日本語"
    '${s1}' '${s3}' = "123english"
    '${s1}' '${s4}' = "123français"
    '${s1}' '${s5}' = "123abc"
    
    '${s1}' '${s6}' = "123def"
    '${s2}' '${s1}' = "日本語123"
    '${s2}' '${s2}' = "日本語日本語"@ja
    '${s2}' '${s3}' = "日本語english"
    '${s2}' '${s4}' = "日本語français"
    '${s2}' '${s5}' = "日本語abc"
    '${s2}' '${s6}' = "日本語def"
    
    '${s3}' '${s1}' = "english123"
    '${s3}' '${s2}' = "english日本語"
    '${s3}' '${s3}' = "englishenglish"@en
    '${s3}' '${s4}' = "englishfrançais"
    '${s3}' '${s5}' = "englishabc"
    '${s3}' '${s6}' = "englishdef"
    
    '${s4}' '${s1}' = "français123"
    '${s4}' '${s2}' = "français日本語"
    '${s4}' '${s3}' = "françaisenglish"
    '${s4}' '${s4}' = "françaisfrançais"@fr
    '${s4}' '${s5}' = "françaisabc"
    '${s4}' '${s6}' = "françaisdef"
    
    '${s5}' '${s1}' = "abc123"
    '${s5}' '${s2}' = "abc日本語"
    '${s5}' '${s3}' = "abcenglish"
    '${s5}' '${s4}' = "abcfrançais"
    '${s5}' '${s5}' = "abcabc"^^xsd:string
    '${s5}' '${s6}' = "abcdef"^^xsd:string
    
    '${s6}' '${s1}' = "def123"
    '${s6}' '${s2}' = "def日本語"
    '${s6}' '${s3}' = "defenglish"
    '${s6}' '${s4}' = "deffrançais"
    '${s6}' '${s5}' = "defabc"^^xsd:string
    '${s6}' '${s6}' = "defdef"^^xsd:string
    `,
    errorTable: `
      '${s1}' '${s7}' = ''
      '${s2}' '${s7}' = ''
      '${s3}' '${s7}' = ''
      '${s4}' '${s7}' = ''
      '${s5}' '${s7}' = ''
      '${s6}' '${s7}' = ''
      '${s7}' '${s7}' = ''
  
      '${s7}' '${s1}' = ''
      '${s7}' '${s2}' = ''
      '${s7}' '${s3}' = ''
      '${s7}' '${s4}' = ''
      '${s7}' '${s5}' = ''
      '${s7}' '${s6}' = ''
    `,
  });
});

/**
 * RESULTS: concat02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="str"/>
 * </head>
 * <results>
 *   <result>
 *     <binding name="str">
 *       <literal datatype="http://www.w3.org/2001/XMLSchema#string">abcabc</literal>
 *     </binding>
 *   </result>
 *   <result>
 *     <binding name="str">
 *       <literal datatype="http://www.w3.org/2001/XMLSchema#string">abcdef</literal>
 *     </binding>
 *   </result>
 *   <result>
 *     <binding name="str">
 *       <literal datatype="http://www.w3.org/2001/XMLSchema#string">defabc</literal>
 *     </binding>
 *   </result>
 *   <result>
 *     <binding name="str">
 *       <literal datatype="http://www.w3.org/2001/XMLSchema#string">defdef</literal>
 *     </binding>
 *   </result>
 *   <result><binding name="str"><literal xml:lang="en">englishenglish</literal></binding></result>
 *   <result><binding name="str"><literal xml:lang="fr">françaisfrançais</literal></binding></result>
 *   <result><binding name="str"><literal xml:lang="ja">日本語日本語</literal></binding></result>
 *   <result><binding name="str"><literal>123abc</literal></binding></result>
 *   <result><binding name="str"><literal>123def</literal></binding></result>
 *   <result><binding name="str"><literal>123english</literal></binding></result>
 *   <result><binding name="str"><literal>123français</literal></binding></result>
 *   <result><binding name="str"><literal>123日本語</literal></binding></result>
 *   <result><binding name="str"><literal>123123</literal></binding></result>
 *   <result><binding name="str"><literal>abc123</literal></binding></result>
 *   <result><binding name="str"><literal>abcenglish</literal></binding></result>
 *   <result><binding name="str"><literal>abcfrançais</literal></binding></result>
 *   <result><binding name="str"><literal>abc日本語</literal></binding></result>
 *   <result><binding name="str"><literal>def123</literal></binding></result>
 *   <result><binding name="str"><literal>defenglish</literal></binding></result>
 *   <result><binding name="str"><literal>deffrançais</literal></binding></result>
 *   <result><binding name="str"><literal>def日本語</literal></binding></result>
 *   <result><binding name="str"><literal>english123</literal></binding></result>
 *   <result><binding name="str"><literal>englishabc</literal></binding></result>
 *   <result><binding name="str"><literal>englishdef</literal></binding></result>
 *   <result><binding name="str"><literal>englishfrançais</literal></binding></result>
 *   <result><binding name="str"><literal>english日本語</literal></binding></result>
 *   <result><binding name="str"><literal>français123</literal></binding></result>
 *   <result><binding name="str"><literal>françaisabc</literal></binding></result>
 *   <result><binding name="str"><literal>françaisdef</literal></binding></result>
 *   <result><binding name="str"><literal>françaisenglish</literal></binding></result>
 *   <result><binding name="str"><literal>français日本語</literal></binding></result>
 *   <result><binding name="str"><literal>日本語123</literal></binding></result>
 *   <result><binding name="str"><literal>日本語abc</literal></binding></result>
 *   <result><binding name="str"><literal>日本語def</literal></binding></result>
 *   <result><binding name="str"><literal>日本語english</literal></binding></result>
 *   <result><binding name="str"><literal>日本語français</literal></binding></result>
 *   <result></result> <!-- s1, s7 -->
 *   <result></result> <!-- s2, s7 -->
 *   <result></result> <!-- s3, s7 -->
 *   <result></result> <!-- s4, s7 -->
 *   <result></result> <!-- s5, s7 -->
 *   <result></result> <!-- s6, s7 -->
 *   <result></result> <!-- s7, s7 -->
 *   <result></result> <!-- s7, s1 -->
 *   <result></result> <!-- s7, s2 -->
 *   <result></result> <!-- s7, s3 -->
 *   <result></result> <!-- s7, s4 -->
 *   <result></result> <!-- s7, s5 -->
 *   <result></result> <!-- s7, s6 -->
 * </results>
 * </sparql>
 */
