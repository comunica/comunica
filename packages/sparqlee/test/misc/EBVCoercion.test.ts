import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';
// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  runTestTable({
    arity: 2,
    notation: Notation.Infix,
    operation: '&&',
    aliases: bool,
    testTable: `
    '"non lexical"^^xsd:boolean' true = false
    '"non lexical"^^xsd:integer' true = false
    
    true true = true
    false false = false
    
    ""              true = false
    ""@en           true = false
    ""^^xsd:string  true = false
    
    "a"             true = true
    "a"@en          true = true
    "a"^^xsd:string true = true
    
    "0"^^xsd:integer      true = false
    "0.0"^^xsd:double     true = false
    "0"^^xsd:unsignedInt  true = false
    "NaN"^^xsd:float      true = false
    
    "3"^^xsd:integer      true = true
    "0.01667"^^xsd:double true = true
    "1"^^xsd:unsignedInt  true = true
    "INF"^^xsd:float      true = true
    "-INF"^^xsd:float     true = true
    `,
    errorTable: `
    ?a true = ''
    "2001-10-26T21:32:52+02:00"^^xsd:dateTime true = ''
    <http://example.com> true = ''
    `,
  });
});
