import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';
import * as Data from './_data';

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
    x1p,
    x1q,
    x2q,
    x3q,
    x4p,
    x4q,
    x5p,
    x5q,
    x6p,
    x6q,
    x7p,
    x7q,
    x8p,
    x8q,
  } = Data.dataBuiltin3();
  runFuncTestTable({
    notation: Notation.Infix,
    operation: '+',
    arity: 2,
    errorTable: `
    'str(${x1p})'              'str(${x1q})' = ''
    'str(BNODE())'             'str(${x2q})' = ''
    'str(<http://example/a>)'  'str(${x3q})' = ''
    'str(${x4p})'              'str(${x4q})' = ''
    'str(${x5p})'              'str(${x5q})' = ''
    'str(${x6p})'              'str(${x6q})' = ''
    'str(${x7p})'              'str(${x7q})' = ''
    'str(${x8p})'              'str(${x8q})' = ''
    `,
  });
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
