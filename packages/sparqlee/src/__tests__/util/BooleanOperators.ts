import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { evaluation_for } from './Evaluation';
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

export type OpTable = string[];

export function test_binary_operator(op: string, table: OpTable) {
    for (let row of table) {
        let [left, right, result] = row.split(' ');
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

export function test_unary_operator(op: string, table: OpTable) {
    for (let row of table) {
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