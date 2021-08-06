import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';

/**
 * REQUEST: notin01.rq
 *
 * ASK {
 *   FILTER(2 NOT IN ())
 * }
 */

/**
 * Manifest Entry
 * :notin01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "NOT IN 1" ;
 *   mf:feature sparql:in ;
 *   mf:feature sparql:not ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-01-31#resolution_3> ;
 *     mf:action
 *          [ qt:query  <notin01.rq> ;
 *            qt:data   <data.ttl> ] ;
 *     mf:result  <notin01.srx> ;
 *   .
 */

describe('We should respect the notin01 spec', () => {
  runTestTable({
    arity: 2,
    notation: Notation.Infix,
    operation: 'NOT IN',
    aliases: bool,
    testTable: `
      2 '()' = true
    `,
  });
});

/**
 * RESULTS: notin01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head/>
 * <boolean>true</boolean>
 * </sparql>
 */
