import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { testBinOp, testUnOp } from '../util/Operators';

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
    argMap: {} = argMapping
) {
    testBinOp(op, table, errTable, argMap, resultMapping)
}
function testUnary(
    op: string,
    table: string,
    errTable: string = errorTableUnary,
    argMap: {} = argMapping
) {
    testUnOp(op, table, errTable, argMap, resultMapping)
}

describe.skip('the evaluation of simple boolean expressions', () => {
    describe('like boolean literals › like', () => {
        const table = `
        true = true
        false = false
        `
        testUnary('', table);
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
            false false = true2
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

    // This should be placed in the relative type files (numeric, literal, ...)
    // and be tested as well in operators that use coercion
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
        badbool   = false
        badint    = false
        true      = true
        false     = false
        emptys    = false
        nonemptys = true
        NaN       = false
        zerod     = false
        zeroi     = false
        nzerof    = true
        nzeroi    = true
        unboundv  = error
        `
        testUnary('', table, undefined, argMap)
    })
});