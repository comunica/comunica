import { bool, int } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';

import { runTestTable } from '../util/utils';

/**
 * REQUEST: struuid01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT (STRLEN(?uuid) AS ?length)
 * WHERE {
 *   BIND(STRUUID() AS ?uuid)
 *   FILTER(ISLITERAL(?uuid) && REGEX(?uuid, "^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$", "i"))
 * }
 */

/**
 * Manifest Entry
 * :struuid01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "STRUUID() pattern match" ;
 *   mf:feature sparql:struuid ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <struuid01.rq> ;
 *            qt:data   <data-empty.nt> ] ;
 *     mf:result  <struuid01.srx> ;
 *   .
 */

describe('We should respect the struuid01 spec', () => {
  const config: ITestTableConfigBase = {
    aliases: bool,
    arity: 'vary',
    notation: Notation.Function,
    operation: '',
  };
  runTestTable({
    ...config,
    operation: 'ISLITERAL',
    testTable: `
      STRUUID() = true    
    `,
  });
  runTestTable({
    ...config,
    operation: 'REGEX',
    testTable: `
      STRUUID() "^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$" "i" = true    
    `,
  });
  runTestTable({
    ...config,
    operation: 'STRLEN',
    testTable: `
      STRUUID() = '${int('36')}'
    `,
  });
});

/**
 * RESULTS: struuid01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="length"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="length"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">36</literal></binding>
 *     </result>
 *   </results>
 * </sparql>
 */
