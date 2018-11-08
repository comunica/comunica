import { bool, dateTime, merge, numeric, str, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '>',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'>\'', () => {
  describe('with numeric operands like', () => {
    const table = `
    -5i 3i = false
    -5f 3f = false
    -5d 3d = false
    -5f 3i = false
    -5f 3i = false

    3i 3i = false
    3d 3d = false
    3f 3f = false

    3i -5i = true
    3d -5d = true
    3f -5f = true
    3i -5f = true
    3d -5f = true

     3i 3f = false
     3i 3d = false
     3d 3f = false
    -0f 0f = false

     INF  INF = false
    -INF -INF = false
     INF  3f  = true
     3f   INF = false
    -INF  3f  = false
     3f  -INF = true

    INF NaN = false
    NaN NaN = false
    NaN 3f  = false
    3f  NaN = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with string operands like', () => {
    const table = `
    empty empty = false
    empty aaa   = false
    aaa   empty = true
    aaa   aaa   = false
    aaa   bbb   = false
    bbb   aaa   = true
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with boolean operands like', () => {
    const table = `
    true  true  = false
    true  false = true
    false true  = false
    false false = false`;

    testTable({ ...wrap(config), table });
  });

  describe('with dateTime operands like', () => {
    const table = `
    earlyN earlyZ = false
    earlyN earlyN = false
    earlyZ earlyZ = false

    earlyN lateN  = false
    earlyN lateZ  = false
    earlyZ lateZ  = false
    earlyZ lateN  = false

    lateN earlyN  = true
    lateN earlyZ  = true
    lateZ earlyN  = true
    lateZ earlyZ  = true

    edge1 edge2   = false
    `;

    testTable({ ...wrap(config), table });
  });
});
