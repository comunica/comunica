import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('hash functions', () => {
  describe('evaluation of \'md5\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'md5',
      notation: Notation.Function,
      testTable: `
        "foo" = "acbd18db4cc2f85cedef654fccc4a4d8"
      `,
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });

  describe('evaluation of \'sha1\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'sha1',
      notation: Notation.Function,
      testTable: `
        "foo" = "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33"
      `,
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });

  describe('evaluation of \'sha256\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'sha256',
      notation: Notation.Function,
      testTable: `
        "foo" = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
      `,
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });

  describe('evaluation of \'sha384\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'sha384',
      notation: Notation.Function,
      testTable: `
        "foo" = "98c11ffdfdd540676b1a137cb1a22b2a70350c9a44171d6b1180c6be5cbb2ee3f79d532c8a1dd9ef2e8e08e752a3babb"
      `,
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });

  describe('evaluation of \'sha512\' like', () => {
    runTestTable({
      arity: 1,
      operation: 'sha512',
      notation: Notation.Function,
      testTable: `
        "foo" = "f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7"
      `,
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });
});
