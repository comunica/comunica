import { Options } from 'Benchmark';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { evaluate } from './Evaluation';

export function testBinOp(
    op: string,
    table: string,
    errTable: string,
    argMap: {},
    resultMap: {},
) {
    const fullTable = parseTable(table.concat(errTable));
    fullTable.forEach(row => {
        let [left, right, result] = parseRow(row);
        // TODO: Check if mapped aliases are defined
        if (result == 'error') {
            it(`(${left}, ${right}) should error`, () => {
                expect(() => { evaluate(`${argMap[left]} ${op} ${argMap[right]}`) })
                .toThrow();
            });
            
        } else {
            it(`(${left}, ${right}) should evaluate ${result}`, () => {
                expect(evaluate(`${argMap[left]} ${op} ${argMap[right]}`))
                .toBe(resultMap[result]);
            });
        }
    });
}


export function testUnOp(
    op: string,
    table: string,
    errTable: string,
    argMap: {},
    resultMap: {}
) {
    const fullTable = parseTable(table.concat(errTable));
    fullTable.forEach(row => {
        let [arg, result] = parseRowUnary(row);
        if (result == 'error') {
            it(`(${arg}) should error`, () => {
                expect(() => evaluate(`${op}${argMap[arg]}`))
                    .toThrow();
            });
        } else {
            it(`(${arg}) should evaluate ${result}`, () => {
                expect(evaluate(`${op}${argMap[arg]}`))
                    .toBe(resultMap[result]);
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

function parseRowUnary(row: string): [string, string] {
    //Trim whitespace and remove double spaces
    row = row.trim().replace(/  +/g, ' ')
    let [arg, _, result] = row.split(' ');
    return [arg, result]
}

function parseTable(table: string): string[] {
    // Trim whitespace, and remove blank lines
    table = table.trim().replace(/^\s*[\r\n]/gm, '');
    return table.split('\n');
}