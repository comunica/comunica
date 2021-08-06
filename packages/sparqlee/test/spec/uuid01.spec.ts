import { bool, int } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';
import { runTestTable } from '../util/utils';

/**
 * REQUEST: uuid01.rq
 *
 * PREFIX : <http://example.org/>
 * PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
 * SELECT (STRLEN(STR(?uuid)) AS ?length)
 * WHERE {
 *   BIND(UUID() AS ?uuid)
 *   FILTER(ISIRI(?uuid)
 *       && REGEX(STR(?uuid), "^urn:uuid:[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$", "i")
 *   )
 * }
 */

/**
 * Manifest Entry
 * :uuid01 rdf:type mf:QueryEvaluationTest ;
 *   mf:name    "UUID() pattern match" ;
 *   mf:feature sparql:uuid ;
 *     dawgt:approval dawgt:Approved ;
 *     dawgt:approvedBy <http://www.w3.org/2009/sparql/meeting/2012-08-07#resolution_2> ;
 *     mf:action
 *          [ qt:query  <uuid01.rq> ;
 *            qt:data   <data-empty.nt> ] ;
 *     mf:result  <uuid01.srx> ;
 *   .
 */

describe('We should respect the uuid01 spec', () => {
  const config: ITestTableConfigBase = {
    aliases: bool,
    arity: 'vary',
    notation: Notation.Function,
    operation: '',
  };
  runTestTable({
    ...config,
    operation: 'ISIRI',
    testTable: `
      UUID() = true    
    `,
  });
  runTestTable({
    ...config,
    operation: 'REGEX',
    testTable: `
      'STR(UUID())' "^urn:uuid:[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$" "i" = true    
    `,
  });
  runTestTable({
    ...config,
    operation: 'STRLEN',
    testTable: `
      STR(UUID()) = '${int('45')}'    
    `,
  });
});

/**
 * RESULTS: uuid01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 *   <head>
 *     <variable name="length"/>
 *   </head>
 *   <results>
 *     <result>
 *       <binding name="length"><literal datatype="http://www.w3.org/2001/XMLSchema#integer">45</literal></binding>
 *     </result>
 *   </results>
 * </sparql>
 */
