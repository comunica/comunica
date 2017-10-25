import { Literal } from 'rdf-js';
import * as RDF from 'rdf-data-model';
import { Parser, Query, FilterPattern, Expression } from 'sparqljs';

import { Mapping } from '../core/Mapping';
import { ExpressionEvaluator } from '../evaluator/ExpressionEvaluator';
import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../util/Consts';

import { testBinOp, testUnOp } from './util/Operators';
import { evaluate } from './util/Evaluation';

// Some aliases that can be used in the truth tables
const argMapping = {
    'true': TRUE_STR,
    'false': FALSE_STR,
    'error': EVB_ERR_STR
}
const resultMapping = {
    'true': TRUE,
    'false': FALSE
}

// Default error handling for boolean operators
const errorTable = `
true  error = error
error true  = error
false error = error
error false = error
error error = error
`
const errorTableUnary = `
error = error
`

// Friendlier aliases for operation tests
function test(
    op: string,
    table: string,
    errTable: string = errorTable,
    argMap = argMapping
) {
    testBinOp(op, table, errorTable, argMap, resultMapping)
}
function testUnary(
    op: string,
    table: string,
    errTable: string = errorTable,
    argMap = argMapping
) {
    testUnOp(op, table, errorTableUnary, argMap, resultMapping)
}

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
            test('||', table, err_table);
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
            test('&&', table, err_table);
        });

        describe('like "=" receiving', () => {
            const table = `
            true  true  = true
            true  false = false
            false true  = false
            false false = true
            `
            test('=', table);
        });

        describe('like "!=" receiving', () => {
            const table = `
            true  true  = false
            true  false = true
            false true  = true
            false false = false
            `
            test('!=', table);
        });

        describe('like "<" receiving', () => {
            const table = `
            true  true  = false
            true  false = false
            false true  = true
            false false = false
            `
            test('<', table);
        });

        describe('like ">" receiving', () => {
            const table = `
            true  true  = false
            true  false = true
            false true  = false
            false false = false
            `
            test('>', table);
        });

        describe('like "<=" receiving', () => {
            const table = `
            true  true  = true
            true  false = false
            false true  = true
            false false = true
            `
            test('<=', table)
        });

        describe('like >= receiving', () => {
            const table = `
            true  true  = true
            true  false = true
            false true  = false
            false false = true
            `
            test('>=', table)
        });

        describe('like "!" receiving', () => {
            const table = `
            true  = false
            false = true
            `
            testUnary('!', table);
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
        badint  true = false

        true  true = true
        false true = false

        emptys    true  = false
        nonemptys true  = true

        NaN true = false

        zerod  true = false
        zeroi  true = false
        nzerof true = true
        nzeroi true = true

        unboundv true = error
        `
        test('&&', table, '', argMap)
    })
});