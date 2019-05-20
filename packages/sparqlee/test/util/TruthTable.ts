import * as RDF from 'rdf-js';

import { termToString } from 'rdf-string';
import { evaluate } from '../util/utils';

/*
 * Maps short strings to longer RDF term-literals for easy use in making
 * evaluation tables.
 * Ex: { 'true': '"true"^^xsd:boolean' }
 */
export interface AliasMap { [key: string]: string; }

/*
 * Maps short strings to longer RDF term-objects for easy use in making
 * evaluation tables.
 * Ex: { 'true': RDFDM.literal("true", RDF.namedNode(DT.XSD_BOOLEAN))}
 */
export interface ResultMap { [key: string]: RDF.Term; }

/*
 * A series of tests in string format.
 * A difference is made between erroring and non-erroring tests-cases because
 * the testing framework requires it, and it allows for some reduction in
 * boilerplate when errorhandling is similar between operators.
 * Some mappings are passed to translate between shorthand aliases and their
 * full SPARQL representations.
 *
 * It's format is
 *  - line separation between rows (= test cases)
 *  - space separation between args
 *  - '=' separation between the args and the result
 *
 * Ex: `
 * true true = false
 * false false = false
 * `
 */
export interface EvaluationConfig {
  op: string;
  arity: number;
  aliasMap: AliasMap;
  resultMap: ResultMap;
  notation: Notation;
}
export type EvaluationTable = EvaluationConfig & {
  table: string;
  errorTable?: string;
};

export enum Notation {
  Infix,
  Prefix,
  Function,
}

/*
 * Given the definition for an evaluation table, test all it's test cases.
 */
export function testTable(definition: EvaluationTable): void {

  const tTable = (definition.arity === 2)
    ? new BinaryTable(definition, BinaryTableParser)
    : new UnaryTable(definition, UnaryTableParser);

  tTable.test();
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

type Row = [string, string, string] | [string, string];

abstract class Table<RowType extends Row> {
  protected parser: TableParser<RowType>;
  protected def: EvaluationTable;

  constructor(def: EvaluationTable, parser: ParserConstructor<RowType>) {
    this.def = def;
    this.parser = new parser(def.table, def.errorTable);
  }

  abstract test(): void;

  abstract format(args: string[]): string;
}

// TODO: Let tables only test function evaluation from the definitions, not the whole evaluator.
class BinaryTable extends Table<[string, string, string]> {
  test(): void {
    this.parser.table.forEach((row) => {
      const [left, right, result] = row;
      const { aliasMap, resultMap, op } = this.def;
      const expr = this.format([op, aliasMap[left], aliasMap[right]]);
      it(`${this.format([op, left, right])} should return ${result}`, () => {
        return expect(evaluate(expr)
          .then(termToString))
          .resolves
          .toEqual(termToString(resultMap[result]));
      });
    });

    this.parser.errorTable.forEach((row) => {
      const [left, right, error] = row;
      const { aliasMap, op } = this.def;
      const expr = this.format([op, aliasMap[left], aliasMap[right]]);
      it(`${this.format([op, left, right])} should error`, () => {
        return expect(evaluate(expr)).rejects.toThrow(Error);
      });
    });
  }

  format([op, fst, snd]: string[]): string {
    switch (this.def.notation) {
      case Notation.Function: return `${op}(${fst}, ${snd})`;
      case Notation.Prefix: return `${op} ${fst} ${snd}`;
      case Notation.Infix: return `${fst} ${op} ${snd}`;
      default: throw new Error('Unreachable');
    }
  }
}

class UnaryTable extends Table<[string, string]> {
  test(): void {
    this.parser.table.forEach((row) => {
      const [arg, result] = row;
      const { aliasMap, op, resultMap } = this.def;
      const expr = this.format([op, aliasMap[arg]]);
      it(`${this.format([op, arg])} should return ${result}`, () => {
        return expect(evaluate(expr)
          .then(termToString))
          .resolves
          .toEqual(termToString(resultMap[result]));
      });
    });

    this.parser.errorTable.forEach((row) => {
      const [arg, error] = row;
      const { aliasMap, op } = this.def;
      const expr = this.format([op, aliasMap[arg]]);
      it(`${this.format([op, arg])} should error`, () => {
        expect(evaluate(expr)).rejects.toThrow(Error);
      });
    });
  }

  format([op, arg]: string[]): string {
    switch (this.def.notation) {
      case Notation.Function: return `${op}(${arg})`;
      case Notation.Prefix: return `${op}${arg}`;
      case Notation.Infix: throw new Error('Cant format a unary operator as infix.');
      default: throw new Error('Unreachable');
    }
  }
}

interface ParserConstructor<RowType extends Row> {
  new(table: string, errorTable: string): TableParser<RowType>;
}

abstract class TableParser<RowType extends Row> {
  table: RowType[];
  errorTable: RowType[];

  constructor(table: string, errTable?: string) {

    this.table = this.splitTable(table).map((row) => this.parseRow(row));
    this.errorTable = (errTable)
      ? this.splitTable(errTable).map((r) => this.parseRow(r))
      : [];
  }

  protected abstract parseRow(row: string): RowType;

  private splitTable(table: string): string[] {
    // Trim whitespace, and remove blank lines
    table = table.trim().replace(/^\s*[\r\n]/gm, '');
    return table.split('\n');
  }
}

class BinaryTableParser extends TableParser<[string, string, string]> {
  protected parseRow(row: string): [string, string, string] {
    row = row.trim().replace(/  +/g, ' ');
    const [left, right, _, result] = row.split(' ');
    return [left, right, result];
  }
}

class UnaryTableParser extends TableParser<[string, string]> {
  protected parseRow(row: string): [string, string] {
    // Trim whitespace and remove double spaces
    row = row.trim().replace(/  +/g, ' ');
    const [arg, _, result] = row.split(' ');
    return [arg, result];
  }
}
