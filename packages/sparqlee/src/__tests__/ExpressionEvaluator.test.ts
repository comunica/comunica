import { Literal } from 'rdf-js';
import * as RDF from 'rdf-data-model';
import { Parser, Query, FilterPattern, Expression } from 'sparqljs';

import { Mapping } from '../core/Mapping';
import { ExpressionEvaluator } from '../evaluator/ExpressionEvaluator';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../util/Consts';

import { test_binary_operator, test_unary_operator, OpTable } from './util/BooleanOperators';
import { error_table, evaluation_for } from './util/Evaluation';

describe('the evaluation of simple boolean expressions', () => {
    describe('like boolean literals', () => {
        it('like true should evaluate true', () => {
            expect(evaluation_for(TRUE_STR)).toBe(TRUE);
        });

        it('like false should evaluate false', () => {
            expect(evaluation_for(FALSE_STR)).toBe(FALSE);
        });

        it('like error should error', () => {
            expect(evaluation_for(EVB_ERR_STR)).toThrow();
        });
    })

    describe('like boolean operations', () => {
        describe('like "||" receiving', () => {
            const table = [
                'true true true',
                'true false true',
                'false true true',
                'false false false'
            ];
            const err_table = [
                'true error true',
                'error true true',
                'false error error',
                'error false error',
                'error error error'
            ];
            test_binary_operator('||', table, err_table);
        });

        describe('like '&&' receiving', () => {
            const table = [
                'true true true',
                'true false false',
                'false true false',
                'false false false'
            ]
            const err_table = [
                'true error error',
                'error true error',
                'false error false',
                'error false false',
                'error error error'
            ]
            test_binary_operator('&&', table, err_table);
        })

        describe('like "!" receiving', () => {
            const table = [
                'true false',
                'false true'
            ];
            test_unary_operator('!', table);
        })

        describe('like "=" receiving', () => {
            const table = [
                'true true true',
                'true false false',
                'false true false',
                'false false true'
            ];
            test_binary_operator('=', table);
        })

        describe('like "!=" receiving', () => {
            const table = [
                'true true false',
                'true false true',
                'false true true',
                'false false false'
            ];
            test_binary_operator('!=', table);
        })

        describe('like "<" receiving', () => {
            const table = [
                'true true false',
                'true false false',
                'false true true',
                'false false false'
            ];
            test_binary_operator('<', table);
        })

        describe('like ">" receiving', () => {
            const table = [
                'true true false',
                'true false true',
                'false true false',
                'false false false'
            ]
            test_binary_operator('>', table);
        });

        describe('like "<=" receiving', () => {
            const table = [
                'true true true',
                'true false false',
                'false true true',
                'false false true'
            ];
            test_binary_operator('<=', table)
        })

        describe('like >= receiving', () => {
            const table = [
                'true true true',
                'true false true',
                'false true false',
                'false false true'
            ]
            test_binary_operator('>=', table)
        })
    });

    describe('like EBV boolean operations', () => {
        // TODO (compare empty strings, numbers, etc...)
    })
});