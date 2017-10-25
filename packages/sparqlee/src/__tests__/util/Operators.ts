import { Options } from 'Benchmark';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { errorTable, errorTableUnary, evaluate } from './Evaluation';
import { Literal } from 'rdf-data-model';

const boolArgMap = {
    'true': TRUE_STR,
    'false': FALSE_STR,
    'error': EVB_ERR_STR
}

const boolResultMap = {
    'true': TRUE,
    'false': FALSE
}

export function testBinOp(op: string, table: string, errTable: string = errorTable, argMap = boolArgMap) {
    const fullTable = parseTable(table.concat(errTable));
    fullTable.forEach(row => {
        let [left, right, result] = parseRow(row);
        if (result == 'error') {
            it(`(${left}, ${right}) should error`, () => {
                expect(evaluate(`${argMap[left]} ${op} ${argMap[right]}`))
                    .toThrow();
            });

        } else {
            it(`(${left}, ${right}) should evaluate ${result}`, () => {
                expect(evaluate(`${argMap[left]} ${op} ${argMap[right]}`))
                    .toBe(boolResultMap[result]);
            });
        }
    });
}


export function testUnOp(op: string, table: string, err_table: string = errorTableUnary, argMap = boolArgMap) {
    const fullTable = parseTable(table.concat(err_table));
    fullTable.forEach(row => {
        let [arg, result] = row.split(' ');
        if (result == 'error') {
            it(`(${arg}) should error`, () => {
                expect(evaluate(`${op}${boolArgMap[arg]}`))
                    .toThrow();
            });
        } else {
            it(`${op}${boolArgMap[arg]}`,() => {
                expect(evaluate(`(${arg}) should evaluate ${result}`))
                    .toBe(boolResultMap[result]
                )
            });
        }
    });
}

function parseRow(row: string): [string, string, string] {
     //Trim whitespace and remove double spaces
     row = row.trim().replace(/  +/g, ' ')
     let [left, right, _, result] = row.split(' ');
     return [left, right, result]
}

function parseTable(table: string): string[] {
    // Trim whitespace, and remove blank lines
    table = table.trim().replace(/^\s*[\r\n]/gm, ''); 
    return table.split('\n');
}