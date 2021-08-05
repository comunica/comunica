import type * as RDF from 'rdf-js';

import { termToString } from 'rdf-string';
import type { GeneralEvaluationConfig } from './generalEvaluation';
import { generalEvaluate } from './generalEvaluation';
import { template } from './utils';

// Maps short strings to longer RDF term-literals for easy use in making
// evaluation tables.
// Ex: { 'true': '"true"^^xsd:boolean' }
export type AliasMap = Record<string, string>;

// Maps short strings to longer RDF term-objects for easy use in making
// evaluation tables.
// Ex: { 'true': RDFDM.literal("true", RDF.namedNode(DT.XSD_BOOLEAN))}
export type ResultMap = Record<string, RDF.Term>;

// A series of tests in string format.
// A difference is made between erroring and non-erroring tests-cases because
// the testing framework requires it, and it allows for some reduction in
// boilerplate when errorhandling is similar between operators.
// Some mappings are passed to translate between shorthand aliases and their
// full SPARQL representations.
//
// It's format is
//  - line separation between rows (= test cases)
//  - space separation between args
//  - '=' separation between the args and the result
//
// Ex: `
// true true = false
// false false = false
// `
export interface IEvaluationConfig {
  op: string;
  arity: number;
  aliasMap: AliasMap;
  resultMap: ResultMap;
  notation: Notation;
  generalEvaluationConfig?: GeneralEvaluationConfig;
}
export type EvaluationTable = IEvaluationConfig & {
  table?: string;
  errorTable?: string;
};

export enum Notation {
  Infix,
  Prefix,
  Function,
}

// Given the definition for an evaluation table, test all it's test cases.
export function testTable(definition: EvaluationTable): void {
  const tTable = (definition.arity === 2) ?
    new BinaryTable(definition, BinaryTableParser) :
    new UnaryTable(definition, UnaryTableParser);

  tTable.test();
}

// -----------------------------------------------------------------------------
// Internals
// -----------------------------------------------------------------------------

type Row = [string, string, string] | [string, string];

abstract class Table<RowType extends Row> {
  protected parser: TableParser<RowType>;
  protected def: EvaluationTable;

  public constructor(def: EvaluationTable, parser: ParserConstructor<RowType>) {
    this.def = def;
    this.parser = new parser(def.table, def.errorTable);
  }

  abstract test(): void;

  protected abstract format(args: string[]): string;
}

// TODO: Let tables only test function evaluation from the definitions, not the whole evaluator.
class BinaryTable extends Table<[string, string, string]> {
  public test(): void {
    this.parser.table.forEach(row => {
      const [ left, right, result ] = row;
      const { aliasMap, resultMap, op, generalEvaluationConfig } = this.def;
      const expr = this.format([ op, aliasMap[left], aliasMap[right] ]);
      it(`${this.format([ op, left, right ])} should return ${result}`, async() => {
        const evaluated = await generalEvaluate({
          expression: template(expr), expectEquality: true, generalEvaluationConfig,
        });
        expect(termToString(evaluated.asyncResult)).toEqual(termToString(resultMap[result]));
      });
    });

    this.parser.errorTable.forEach(row => {
      const [ left, right, error ] = row;
      const { aliasMap, op, generalEvaluationConfig } = this.def;
      const expr = this.format([ op, aliasMap[left], aliasMap[right] ]);
      it(`${this.format([ op, left, right ])} should error`, async() => {
        await expect(generalEvaluate({
          expression: template(expr), expectEquality: true, generalEvaluationConfig,
        })).rejects.toThrow(error);
      });
    });
  }

  protected format([ op, fst, snd ]: string[]): string {
    switch (this.def.notation) {
      case Notation.Function: return `${op}(${fst}, ${snd})`;
      case Notation.Prefix: return `${op} ${fst} ${snd}`;
      case Notation.Infix: return `${fst} ${op} ${snd}`;
      default: throw new Error('Unreachable');
    }
  }
}

class UnaryTable extends Table<[string, string]> {
  public test(): void {
    this.parser.table.forEach(row => {
      const [ arg, result ] = row;
      const { aliasMap, op, resultMap, generalEvaluationConfig } = this.def;
      const expr = this.format([ op, aliasMap[arg] ]);
      it(`${this.format([ op, arg ])} should return ${result}`, async() => {
        const evaluated = await generalEvaluate({
          expression: template(expr), expectEquality: true, generalEvaluationConfig,
        });
        expect(termToString(evaluated.asyncResult)).toEqual(termToString(resultMap[result]));
      });
    });

    this.parser.errorTable.forEach(row => {
      const [ arg, error ] = row;
      const { aliasMap, op, generalEvaluationConfig } = this.def;
      const expr = this.format([ op, aliasMap[arg] ]);
      it(`${this.format([ op, arg ])} should error`, () => {
        return expect(generalEvaluate({
          expression: template(expr), expectEquality: true, generalEvaluationConfig,
        })).rejects.toThrow(error);
      });
    });
  }

  protected format([ op, arg ]: string[]): string {
    switch (this.def.notation) {
      case Notation.Function: return `${op}(${arg})`;
      case Notation.Prefix: return `${op}${arg}`;
      case Notation.Infix: throw new Error('Cant format a unary operator as infix.');
      default: throw new Error('Unreachable');
    }
  }
}

type ParserConstructor<RowType extends Row> = new(table: string, errorTable: string) => TableParser<RowType>;

abstract class TableParser<RowType extends Row> {
  public readonly table: RowType[];
  public readonly errorTable: RowType[];

  public constructor(table?: string, errTable?: string) {
    this.table = table ? this.splitTable(table).map(row => this.parseRow(row)) : [];
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

class BinaryTableParser extends TableParser<[string, string, string]> {
  protected parseRow(row: string): [string, string, string] {
    row = row.trim().replace(/  +/ug, ' ');
    const [ left, right, _, result ] = row.match(/([^\s']+|'[^']*')+/ug)
      .map(i => i.replace(/'([^']*)'/u, '$1'));
    return [ left, right, result ];
  }
}

class UnaryTableParser extends TableParser<[string, string]> {
  protected parseRow(row: string): [string, string] {
    // Trim whitespace and remove double spaces
    row = row.trim().replace(/  +/ug, ' ');
    const [ arg, _, result ] = row.match(/([^\s']+|'[^']*')+/ug)
      .map(i => i.replace(/'([^']*)'/u, '$1'));
    return [ arg, result ];
  }
}
