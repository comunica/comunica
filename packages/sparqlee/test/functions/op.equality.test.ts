import { bool, dateTime, merge, numeric, str, wrap } from '../util/Aliases';
import { Notation, testTable } from '../util/TruthTable';

const config = {
  arity: 2,
  op: '=',
  aliases: merge(numeric, str, dateTime, bool),
  notation: Notation.Infix,
};

describe('evaluation of \'=\'', () => {
  describe('with numeric operands like', () => {
    const table = `
    3i 3i = true
    3d 3d = true
    3f 3f = true

    3i -5i = false
    3d -5d = false
    3f -5f = false

     3i 3f = true
     3i 3d = true
     3d 3f = true
    -0f 0f = true

     INF  INF = true
    -INF -INF = true
     INF  3f  = false
     3f   INF = false
     INF  NaN = false
     NaN  NaN = false
     NaN  3f  = false
     3f   NaN = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with string operands like', () => {
    const table = `
    empty empty = true
    empty aaa   = false
    aaa   aaa   = true
    aaa   bbb   = false
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with boolean operands like', () => {
    const table = `
    true  true  = true
    true  false = false
    false true  = false
    false false = true
    `;

    testTable({ ...wrap(config), table });
  });

  describe('with dateTime operands like', () => {
    const table = `
    earlyN earlyZ = true
    earlyN earlyN = true
    earlyZ earlyZ = true

    earlyN lateN  = false
    earlyN lateZ  = false
    earlyZ lateZ  = false
    earlyZ lateN  = false

    edge1 edge2   = true`;

    testTable({ ...wrap(config), table });
  });
});
