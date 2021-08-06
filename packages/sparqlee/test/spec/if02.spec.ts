import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';

/**
 * REQUEST: if02.rq
 *
 * SELECT (IF(1/0, false, true) AS ?error) WHERE {}
 */

/**
 * Manifest Entry
 * :if02 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "IF() error propogation" ;
 *   mf:feature sparql:if ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <if02.rq> ;
 *            qt:data   <data2.ttl> ] ;
 *     mf:result  <if02.srx> ;
 *   .
 */

describe('We should respect the if02 spec', () => {
  runTestTable({
    notation: Notation.Function,
    arity: 'vary',
    operation: 'IF',
    errorTable: `
    '1/0' false true = ''
    `,
  });
});

/**
 * RESULTS: if02.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head>
 *   <variable name="error"/>
 * </head>
 * <results>
 *     <result>
 *     </result>
 * </results>
 * </sparql>
 *
 */
