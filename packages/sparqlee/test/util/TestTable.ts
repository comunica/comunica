import { stringToTermPrefix, template } from './Aliases';
import { generalErrorEvaluation, generalEvaluate } from './generalEvaluation';
import type { TestTableConfig } from './utils';

export enum Notation {
  Infix,
  Prefix,
  Function,
}

type Row = string[];

/**
 * A series of tests in string format.
 * A difference is made between erroring and non-erroring tests-cases because
 * the testing framework requires it, and it allows for some reduction in
 * boilerplate when errorhandling is similar between operators.
 * Some mappings are passed to translate between shorthand aliases and their
 * full SPARQL representations.
 *
 * Its format is
 *  - line separation between rows (= test cases)
 *  - space separation between args
 *  - '=' separation between the args and the result
 *  - the escape characters '' can be used to provide an empty argument/ result or to escape spaces.
 * Ex: `
 * true true = false
 * false false = false
 * `
*/
abstract class Table<RowType extends Row> {
  protected abstract readonly parser: TableParser<RowType>;
  protected abstract readonly def: TestTableConfig;

  abstract test(): void;

  protected async testExpression(expr: string, result: string) {
    const { config, additionalPrefixes } = this.def;
    const aliases = this.def.aliases || {};
    result = aliases[result] || result;
    const evaluated = await generalEvaluate({
      expression: template(expr, additionalPrefixes), expectEquality: true, generalEvaluationConfig: config,
    });
    expect(evaluated.asyncResult).toEqual(stringToTermPrefix(result, additionalPrefixes));
  }

  protected async testErrorExpression(expr: string, error: string) {
    const { config, additionalPrefixes } = this.def;
    const result = await generalErrorEvaluation({
      expression: template(expr, additionalPrefixes), expectEquality: false, generalEvaluationConfig: config,
    });
    expect(result).not.toBeUndefined();
    expect(() => { throw result?.asyncError; }).toThrow(error);
    if (result?.syncError) {
      expect(() => { throw result?.syncError; }).toThrow(error);
    }
  }

  protected abstract format(operation: string, row: RowType): string;
}

export class VariableTable extends Table<string[]> {
  protected readonly parser: TableParser<string[]>;
  protected readonly def: TestTableConfig;
  public constructor(def: TestTableConfig) {
    super();
    this.def = def;
    this.parser = new VariableTableParser(def.testTable, def.errorTable);
  }

  public test(): void {
    this.parser.table.forEach(row => {
      const result = row[row.length - 1];
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should return ${result}`, async() => {
        const expr = this.format(operation, row.map(el => aliases[el] || el));
        await this.testExpression(expr, result);
      });
    });

    this.parser.errorTable.forEach(row => {
      const error = row[row.length - 1];
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should error`, async() => {
        const expr = this.format(operation, row.map(el => aliases[el] || el));
        await this.testErrorExpression(expr, error);
      });
    });
  }

  protected format(operation: string, row: string[]): string {
    if (this.def.notation === Notation.Function) {
      return `${operation}(${row.slice(0, -1).join(', ')})`;
    }
    throw new Error('Variable argument count only supported with function notation.');
  }
}

export class UnaryTable extends Table<[string, string]> {
  protected readonly parser: TableParser<[string, string]>;
  protected readonly def: TestTableConfig;
  public constructor(def: TestTableConfig) {
    super();
    this.def = def;
    this.parser = new UnaryTableParser(def.testTable, def.errorTable);
  }

  public test(): void {
    this.parser.table.forEach(row => {
      const [ arg, result ] = row;
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should return ${result}`, async() => {
        const expr = this.format(operation, <[string, string]> row.map(el => aliases[el] || el));
        await this.testExpression(expr, result);
      });
    });

    this.parser.errorTable.forEach(row => {
      const [ _, error ] = row;
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should error`, async() => {
        const expr = this.format(operation, <[string, string]> row.map(el => aliases[el] || el));
        await this.testErrorExpression(expr, error);
      });
    });
  }

  protected format(operation: string, row: [string, string]): string {
    const [ arg, _ ] = row;
    switch (this.def.notation) {
      case Notation.Function: return `${operation}(${arg})`;
      case Notation.Prefix: return `${operation}${arg}`;
      case Notation.Infix: throw new Error('Cant format a unary operator as infix.');
      default: throw new Error('Unreachable');
    }
  }
}

// TODO: Let tables only test function evaluation from the definitions, not the whole evaluator.
export class BinaryTable extends Table<[string, string, string]> {
  protected readonly parser: TableParser<[string, string, string]>;
  protected readonly def: TestTableConfig;
  public constructor(def: TestTableConfig) {
    super();
    this.def = def;
    this.parser = new BinaryTableParser(def.testTable, def.errorTable);
  }

  public test(): void {
    this.parser.table.forEach(row => {
      const result = row[2];
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should return ${result}`, async() => {
        const expr = this.format(operation, <[string, string, string]> row.map(el => aliases[el] || el));
        await this.testExpression(expr, result);
      });
    });

    this.parser.errorTable.forEach(row => {
      const error = row[2];
      const { operation } = this.def;
      const aliases = this.def.aliases || {};
      it(`${this.format(operation, row)} should error`, async() => {
        const expr = this.format(operation, <[string, string, string]> row.map(el => aliases[el] || el));
        await this.testErrorExpression(expr, error);
      });
    });
  }

  protected format(operation: string, row: [string, string, string]): string {
    const [ fst, snd, _ ] = row;
    switch (this.def.notation) {
      case Notation.Function: return `${operation}(${fst}, ${snd})`;
      case Notation.Prefix: return `${operation} ${fst} ${snd}`;
      case Notation.Infix: return `${fst} ${operation} ${snd}`;
      default: throw new Error('Unreachable');
    }
  }
}

abstract class TableParser<RowType extends Row> {
  public readonly table: RowType[];
  public readonly errorTable: RowType[];

  public constructor(table?: string, errTable?: string) {
    this.table = table ?
      this.splitTable(table).map(row => this.parseRow(row)) :
      [];
    this.errorTable = (errTable) ?
      this.splitTable(errTable).map(r => this.parseRow(r)) :
      [];
  }

  protected abstract parseRow(row: string): RowType;

  private splitTable(table: string): string[] {
    // Trim whitespace, and remove blank lines
    table = table.trim().replace(/^\s*[\n\r]/ugm, '');
    return table.split('\n');
  }
}

class VariableTableParser extends TableParser<string[]> {
  protected parseRow(row: string): string[] {
    row = row.trim().replace(/ +/ug, ' ');
    const match = row.match(/([^\s']+|'[^']*')+/ug)?.filter(str => str !== '=')
      ?.map(i => i.replace(/'([^']*)'/u, '$1'));
    if (match === undefined) {
      throw new Error(`Could not parse row: ${row}.`);
    }
    return match;
  }
}

class BinaryTableParser extends TableParser<[string, string, string]> {
  protected parseRow(row: string): [string, string, string] {
    row = row.trim().replace(/ +/ug, ' ');
    const matched = row.match(/([^\s']+|'[^']*')+/ug)
      ?.map(i => i.replace(/'([^']*)'/u, '$1'));
    if (matched === undefined) {
      throw new Error(`Could not parse row: ${row}.`);
    }
    const [ left, right, _, result ] = matched;
    return [ left, right, result ];
  }
}

class UnaryTableParser extends TableParser<[string, string]> {
  protected parseRow(row: string): [string, string] {
    // Trim whitespace and remove double spaces
    row = row.trim().replace(/ +/ug, ' ');
    const matched = row.match(/([^\s']+|'[^']*')+/ug)
      ?.map(i => i.replace(/'([^']*)'/u, '$1'));
    if (matched === undefined) {
      throw new Error(`Could not parse row: ${row}.`);
    }
    const [ arg, _, result ] = matched;
    return [ arg, result ];
  }
}
