import {bool, dateTime, merge, numeric, str, StringMap, stringToTermPrefix, TermMap, wrap} from '../util/Aliases';
import {Notation, testTable} from '../util/TruthTable';
import * as RDF from 'rdf-js';
import {NamedNode} from 'rdf-js';

function mapToTerm(map: StringMap): TermMap {
  return Object
    .keys(map)
    .reduce((p, k) => ({ ...p, [k]: stringToTermPrefix(map[k]) }), {});
}

describe('extension function: term-equal', () => {
  const table = `
  3i 3i = true
  3d 3d = true
  3f 3f = true

  3i -5i = false
  3d -5d = false
  3f -5f = false

  3i 3f = false
  3i 3d = false
  3d 3f = false
  -0f 0f = false

  INF  INF = true
  -INF -INF = true
  INF  3f  = false
  3f   INF = false
  INF  NaN = false
  NaN  NaN = true
  NaN  3f  = false
  3f   NaN = false
  `;
  function extensionTermEqual(args: RDF.Term[]) {
    const resMap = mapToTerm(merge(numeric, str, dateTime, bool));
    return resMap[String(args[0].equals(args[1]))];
  }
  const configBase = {
    arity: 2,
    op: '<https://example.org/functions#equal>',
    aliases: merge(numeric, str, dateTime, bool),
    notation: Notation.Function,
  };
  describe('async evaluation of async equal function', () => {
    const config = Object.assign(Object.assign({}, configBase), {
      asyncExtensionFunctionCreator: ((functionNamedNode: NamedNode) => {
        if (functionNamedNode.value === 'https://example.org/functions#equal') {
        return (args: RDF.Term[]) => Promise.resolve(extensionTermEqual(args));
        }
      })
    });
    testTable({...wrap(config), table});
  });
  // TODO: we should test whether the right error is thrown here. (needs to be implemented when we refactor tests)
});
