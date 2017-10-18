import { Literal } from 'rdf-js';
import * as RDF from 'rdf-data-model';
import { Parser, Query, FilterPattern, Expression } from 'sparqljs';

import { Mapping } from '../core/Mapping';
import { ExpressionEvaluator } from '../evaluator/ExpressionEvaluator';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../util/Consts';

import { test_binary_operator, test_unary_operator, OpTable } from './util/BooleanOperators';
import { evaluation_for } from './util/Evaluation';

describe('the evaluation of simple boolean expressions', () => {
    describe('like (EBV) boolean literals', () => {
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
        describe('like OR taking', () => {
            let table = [
                'true true true',
                'true false true',
                'false true true',
                'false false false',
                'true error true',
                'error true true',
                'false error error',
                'error false error',
                'error error error'
            ]
            test_binary_operator('||', table);
        });

        describe('like AND taking', () => {
            let table = [
                'true true true',
                'true false false',
                'false true false',
                'false false false',
                'true error error',
                'error true error',
                'false error false',
                'error false false',
                'error error error'
            ]

            test_binary_operator('&&', table);
        })

        describe('like NOT taking', () => {
            let table = [
                'true false',
                'false true',
                'error error'
            ]
            test_unary_operator('!', table);
        })
    });
});