import { bool, dateTime, merge, numeric, str, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '<',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'<\'', () => {
  describe('with numeric operands like', () => {
    const table = `
    -5i 3i = true
    -5f 3f = true
    -5d 3d = true
    -5f 3i = true
    -5f 3d = true

    3i 3i = false
    3d 3d = false
    3f 3f = false

    3i -5i = false
    3d -5d = false
    3f -5f = false
    3i -5f = false
    3d -5f = false

     3i 3f = false
     3i 3d = false
     3d 3f = false
    -0f 0f = false

     INF  INF = false
    -INF -INF = false
     INF  3f  = false
     3f   INF = true
    -INF  3f  = true
     3f  -INF = false

    INF NaN = false
    NaN NaN = false
    NaN 3f  = false
    3f NaN  = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with string operands like', () => {
    const table = `
    empty empty = false
    empty aaa   = true
    aaa   empty = false
    aaa   aaa   = false
    aaa   bbb   = true
    bbb   aaa   = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with boolean operands like', () => {
    const table = `
    true  true  = false
    true  false = false
    false true  = true
    false false = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with dateTime operands like', () => {
    const table = `
    earlyN earlyZ = false
    earlyN earlyN = false
    earlyZ earlyZ = false

    earlyN lateN  = true
    earlyN lateZ  = true
    earlyZ lateZ  = true
    earlyZ lateN  = true

    lateN earlyN  = false
    lateN earlyZ  = false
    lateZ earlyN  = false
    lateZ earlyZ  = false

    edge1 edge2   = false
    `;

    testTable({ ...wrap(config), table });
  });
});
