import { Literal } from 'rdf-js';
import * as RDF from 'rdf-data-model';
import { Parser, Query, FilterPattern, Expression } from 'sparqljs';

import { Mapping } from '../core/Mapping';
import { ExpressionEvaluator } from '../evaluator/ExpressionEvaluator';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../util/Consts';

import { testBinOp, testUnOp } from './util/Operators';
import { errorTable, evaluate } from './util/Evaluation';

describe('the evaluation of simple boolean expressions', () => {
    describe('like boolean literals', () => {
        it('like true should evaluate true', () => {
            expect(evaluate(TRUE_STR)).toBe(TRUE);
        });

        it('like false should evaluate false', () => {
            expect(evaluate(FALSE_STR)).toBe(FALSE);
        });

        it('like error should error', () => {
            expect(evaluate(EVB_ERR_STR)).toThrow();
        });
    })

    describe('like boolean operations', () => {
        describe('like "||" receiving', () => {
            const table = `
            true  true  = true
            true  false = true
            false true  = true
            false false = false
            `

            const err_table = `
            true  error = true
            error true  = true
            false error = error
            error false = error
            error error = error
            `
            testBinOp('||', table, err_table);
        });

        describe('like "&&" receiving', () => {
            const table = `
            true  true  = true
            true  false = false
            false true  = false
            false false = false
            `
            const err_table = `
            true  error = error
            error true  = error
            false error = false
            error false = false
            error error = error
            `
            testBinOp('&&', table, err_table);
        });

        describe('like "=" receiving', () => {
            const table = `
            true  true  = true
            true  false = false
            false true  = false
            false false = true'
            `
            testBinOp('=', table);
        });

        describe('like "!=" receiving', () => {
            const table = `
            true  true  = false
            true  false = true
            false true  = true
            false false = false'
            `
            testBinOp('!=', table);
        });

        describe('like "<" receiving', () => {
            const table = `
            true  true  = false
            true  false = false
            false true  = true
            false false = false'
            `
            testBinOp('<', table);
        });

        describe('like ">" receiving', () => {
            const table = `
            true  true  = false
            true  false = true
            false true  = false
            false false = false'
            `
            testBinOp('>', table);
        });

        describe('like "<=" receiving', () => {
            const table = `
            true  true  = true
            true  false = false
            false true  = true
            false false = true'
            `
            testBinOp('<=', table)
        });

        describe('like >= receiving', () => {
            const table = `
            true  true  = true
            true  false = true
            false true  = false
            false false = true'
            `
            testBinOp('>=', table)
        });

        describe('like "!" receiving', () => {
            const table = `
            true  = false
            false = true
            `
            testUnOp('!', table);
        });
    });

    describe('like EBV boolean coercion (&&) with', () => {
        const argMap = {
            'true': TRUE_STR,
            'false': FALSE_STR,
            'error': EVB_ERR_STR,
            'badbool': '"notabool"^^xsd:boolean', // Boolean with bad lexical form
            'badint': '"notint"^^xsd:integer',    // Integer with bad lexical form 
            'nonemptys': '"nonempty string"',     // Non empty string
            'emptys': '""',                 // Empty string
            'NaN': '"NaN"^^xsd:integer',    // NaN
            'zeroi': '"0"^^xsd:integer',    // Zero valued integer
            'zerod': '"0.00"^^xsd:decimal', // Zero valued decimal
            'nzerof': '"-1E4"^^xsd:float',  // Non zero float
            'nzeroi': '"-34"^^xsd:integer', // Non zero integer
            'unboundv': '?unboundvariable', // An unbound variable
        }

        const table = `
        badbool true = false
        badint  TRUE = false

        true  true = true
        false true = false

        emptys    true  = false
        nonemptys true  = true

        NaN true = false

        zerod true = false
        zeroi true = false
        nzerof true = true
        nzeroi true = true

        unboundv true = error
        `
        testBinOp('&&', table, '', argMap)
    })
});