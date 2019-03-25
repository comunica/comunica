import { aliases as a, testAll, testAllErrors } from '../util/utils';

// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  testAll([
    `"non lexical"^^xsd:boolean && ${a.true} = ${a.false}`,
    `"non lexical"^^xsd:integer && ${a.true} = ${a.false}`,

    `${a.true}  && ${a.true}  = ${a.true}`,
    `${a.false} && ${a.false} = ${a.false}`,

    `""              && ${a.true} = ${a.false}`,
    `""@en           && ${a.true} = ${a.false}`,
    `""^^xsd:string  && ${a.true} = ${a.false}`,

    `"a"             && ${a.true} = ${a.true} `,
    `"a"@en          && ${a.true} = ${a.true} `,
    `"a"^^xsd:string && ${a.true} = ${a.true} `,

    `"0"^^xsd:integer      && ${a.true} = ${a.false}`,
    `"0.0"^^xsd:double     && ${a.true} = ${a.false}`,
    `"0"^^xsd:unsignedInt  && ${a.true} = ${a.false}`,
    `"NaN"^^xsd:float      && ${a.true} = ${a.false}`,

    `"3"^^xsd:integer      && ${a.true} = ${a.true} `,
    `"0.01667"^^xsd:double && ${a.true} = ${a.true} `,
    `"1"^^xsd:unsignedInt  && ${a.true} = ${a.true} `,
    `"INF"^^xsd:float      && ${a.true} = ${a.true} `,
    `"-INF"^^xsd:float     && ${a.true} = ${a.true} `,

  ]);

  testAllErrors([
    `?a && ${a.true} = error`,
    `"2001-10-26T21:32:52+02:00"^^xsd:dateTime && ${a.true} = error`,
    `<http://example.com> && ${a.true} = error`,
  ]);
});
