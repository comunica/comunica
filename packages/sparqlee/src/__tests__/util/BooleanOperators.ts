import { Options } from 'Benchmark';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { error_table, error_table_unary, evaluation_for } from './Evaluation';
import { Literal } from 'rdf-data-model';

const arg_map = {
    'true': TRUE_STR,
    'false': FALSE_STR,
    'error': EVB_ERR_STR
}

const result_map = {
    'true': TRUE,
    'false': FALSE
}

export type OpTable = string;

export function test_binary_operator(op: string, table: OpTable, err_table: OpTable = error_table) {
    // Concat errors, trim whitespace, and remove blank lines
    var full_string = table.concat(err_table);
    full_string = full_string.trim().replace(/^\s*[\r\n]/gm, ''); 
    const full_table = full_string.split('\n');

    for (let row of full_table) {
        //Trim whitespace and remove double spaces
        row = row.trim().replace(/  +/g, ' ')
        let [left, right, _, result] = row.trim().split(' ');

        if (result == 'error') {
            __test_throw(
                `(${left}, ${right}) should error`,
                `${arg_map[left]} ${op} ${arg_map[right]}`
            );

        } else {
            __test_to_be(
                `(${left}, ${right}) should evaluate ${result}`,
                `${arg_map[left]} && ${arg_map[right]}`,
                result_map[result]
            );
        }
    }
}


export function test_unary_operator(op: string, table: OpTable, err_table = error_table_unary) {
    const full_table = ''; //table.concat(err_table);
    for (let row of full_table) {
        let [arg, result] = row.split(' ');
        if (result == 'error') {
            __test_throw(`(${arg}) should error`, `${op}${arg_map[arg]}`);
        } else {
            __test_to_be(
                `(${arg}) should evaluate ${result}`,
                `${op}${arg_map[arg]}`,
                result_map[result]
            );
        }
    }
}

function __test_to_be(msg: string, expr: string, result: Literal) {
    it(msg, () => {
        expect(evaluation_for(expr)).toBe(result);
    })
}

function __test_throw(msg, expr) {
    it(msg, () => {
        expect(evaluation_for(expr)).toThrow();
    })
}