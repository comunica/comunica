import { Options } from 'Benchmark';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { error_table, error_table_unary, evaluate } from './Evaluation';
import { Literal } from 'rdf-data-model';

const argument_mapping = {
    'true': TRUE_STR,
    'false': FALSE_STR,
    'error': EVB_ERR_STR
}

const resultMap = {
    'true': TRUE,
    'false': FALSE
}

export function test_binop(op: string, table: string, err_table: string = error_table, arg_map = argument_mapping) {
    const full_table = parseTable(table.concat(err_table));
    for (let row of full_table) {
        //Trim whitespace and remove double spaces
        row = row.trim().replace(/  +/g, ' ')
        let [left, right, _, result] = row.trim().split(' ');

        if (result == 'error') {
            it(`(${left}, ${right}) should error`, () => {
                expect(evaluate(`${arg_map[left]} ${op} ${arg_map[right]}`))
                    .toThrow();
            });

        } else {
            it(`(${left}, ${right}) should evaluate ${result}`, () => {
                expect(evaluate(`${arg_map[left]} ${op} ${arg_map[right]}`))
                    .toBe(resultMap[result]);
            });
        }
    }
}


export function test_unop(op: string, table: string, err_table: string = error_table_unary, arg_map = argument_mapping) {
    const full_table = parseTable(table.concat(err_table));
    for (let row of full_table) {
        let [arg, result] = row.split(' ');
        if (result == 'error') {
            it(`(${arg}) should error`, () => {
                expect(evaluate(`${op}${argument_mapping[arg]}`))
                    .toThrow();
            });
        } else {
            it(`${op}${argument_mapping[arg]}`,() => {
                expect(evaluate(`(${arg}) should evaluate ${result}`))
                    .toBe(resultMap[result]
                )
            });
        }
    }
}

function parseTable(table: string): string[] {
    // Trim whitespace, and remove blank lines
    table = table.trim().replace(/^\s*[\r\n]/gm, ''); 
    return table.split('\n');
}