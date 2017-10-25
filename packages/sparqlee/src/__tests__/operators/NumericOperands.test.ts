import { TRUE, TRUE_STR, FALSE, FALSE_STR, EVB_ERR_STR } from '../../util/Consts';
import { testBinOp, testUnOp } from '../util/Operators';

// Some aliases that can be used in the truth tables
const argMapping = {
    'true': TRUE_STR,
    'false': FALSE_STR,
    'error': EVB_ERR_STR,
    'NaN': '"NaN"^^xsd:float',
    'gener': '"13"^^xsd:integer', // Generic correct numeric value
}
const resultMapping = {
    'true': TRUE,
    'false': FALSE
}

// Default error handling for boolean operators
const errorTable = `
gener error = error
error gener = error
error error = error

NaN   NaN   = false
NaN   gener = false
gener NaN   = false
`
const errorTableUnary = `
error = error
Nan   = NaN
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

describe.skip('the evaluation of simple numeric boolean expressions', () => {
    describe('like numeric literals › like', () => {
        const argMap = {
            'error': EVB_ERR_STR,
            'NaN': '"NaN"^^xsd:float',
            'gener': '"13"^^xsd:integer',
            'integer': '"6"^^xsd:integer',
            'decimal': '"6.5608"^^xsd:decimal',
            'float': '"12.6e3"^^xsd:float',
            'double': '"24.12e6"^^xsd:double',
            'nonPosInt': '"-6"^^xsd:nonPositiveInteger',
            'negInt': '"-5"^^xsd:negativeInteger',
            'long': '"123123123123"^^xsd:long',
            'int': '"123123123"^^xsd:int',
            'short': '"12123"^^xsd:short',
            'byte': '"123"^^xsd:byte',
            'nonNegInt': '"6"^^xsd:nonNegativeInteger',
            'uLong': '"12312312313"^^xsd:unsignedLong',
            'uInt': '"123123123"^^xsd:unsignedInt',
            'uShort': '"12123"^^xsd:unsignedShort',
            'uByte': '"123"^^xsd:unsignedByte',
            'posInt': '"6"^^xsd:positiveInteger',
        }

        const table = `
        integer = true
        decimal = true
        float = true
        double = true
        nonPosInt = true
        negInt = false
        long = true
        int = true
        short = true
        byte = true
        nonNegInt = true
        uLong = true
        uInt = true
        uShort = true
        uByte = true
        posInt = true
        NaN = false
        `
        testUnary('', table, undefined, argMap);
    });

    describe('like numeric operations', () => {
        // INF, -INF, and NaN are valid float and double values
        const argMap = {
            'error': EVB_ERR_STR,
            'gener': '"13"^^xsd:integer',
            '3i': '"3"^^xsd:integer',
            '3d': '"3.0000"^^xsd:decimal',
            '3f': '"1.5e1"^^xsd:float',
            '-5i': '"-5"^^xsd:integer',
            '-5d': '"-5"^^xsd:decimal',
            '-5f': '"-1.25e2"^^xsd:float',
            'INF': '"INF"^^xsd:float',
            '-INF': '"-INF"^^xsd:float',
            'NaN': '"NaN"^^xsd:float',
            '-0f': '"-0"^^xsd:float',
            '0f': '"0"^^xsd:float'
        }
        
        // NaN = NaN according to https://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes
        // But not according to https://www.w3.org/TR/xpath-functions/#func-numeric-equal
        describe('like "=" receiving', () => {
            const table = `
            3i 3i = true
            3d 3d = true
            3f 3f = true

            3i -5i = false
            3d -5d = false
            3f -5f = false

            3i 3f = true
            3i 3d = true
            3d 3f = true
            -0f 0f = true

            INF INF = true
            -INF -INF = true
            INF 3f = false
            3f INF = false
            INF NaN = false
            NaN NaN = false
            NaN -3f = false
            -3f NaN = false
            `
            test('=', table, undefined, argMap)
        });

        describe('like "!=" receiving', () => {
            const table = `
            3i 3i = false
            3d 3d = false
            3f 3f = false

            3i -5i = true
            3d -5d = true
            3f -5f = true

            3i 3f = false
            3i 3d = false
            3d 3f = false
            -0f 0f = false

            INF INF = false
            -INF -INF = false
            INF 3f = true
            3f INF = true
            INF NaN = true
            NaN NaN = true
            NaN -3f = true
            -3f NaN = true
            `
            test('!=', table, undefined, argMap);
        });

        describe('like "<" receiving', () => {
            const table = `
            -5i 3i = true
            -5f 3f = true
            -5d 3d = true
            -5f 3i = true
            -5f 3d = true

            3i 3i = false
            3d 3d = false
            3f 3f = false

            3i -5i = false
            3d -5d = false
            3f -5f = false
            3i -5f = false
            3d -5f = false

            3i 3f = false
            3i 3d = false
            3d 3f = false
            -0f 0f = false

            INF INF = false
            -INF -INF = false
            INF 3f = false
            3f INF = true
            -INF 3f = true
            3f -INF = false

            INF NaN = false
            NaN NaN = false
            NaN -3f = false
            -3f NaN = false
            `
            test('<', table, undefined, argMap);
        });

        describe('like ">" receiving', () => {
            const table = `
            -5i 3i = false
            -5f 3f = false
            -5d 3d = false
            -5f 3i = false
            -5f 3i = false

            3i 3i = false
            3d 3d = false
            3f 3f = false

            3i -5i = true
            3d -5d = true
            3f -5f = true
            3i -5f = true
            3d -5f = true

            3i 3f = false
            3i 3d = false
            3d 3f = false
            -0f 0f = false

            INF INF = false
            -INF -INF = false
            INF 3f = true
            3f INF = false
            -INF 3f = false
            3f -INF = true

            INF NaN = false
            NaN NaN = false
            NaN -3f = false
            -3f NaN = false
            `
            test('>', table, undefined, argMap);
        })

        describe('like <= receiving', () => {
            const table = `
            -5i 3i = true
            -5f 3f = true
            -5d 3d = true
            -5f 3i = true
            -5f 3i = true

            3i 3i = true
            3d 3d = true
            3f 3f = true

            3i -5i = false
            3d -5d = false
            3f -5f = false
            3i -5f = false
            3d -5f = false

            3i 3f = true
            3i 3d = true
            3d 3f = true
            -0f 0f = true

            INF INF = true
            -INF -INF = true
            INF 3f = false
            3f INF = true
            -INF 3f = true
            3f -INF = false
            `
            test('<=', table, undefined, argMap)
        });

        describe('like >= receiving', () => {
            const table = `
            -5i 3i = false
            -5f 3f = false
            -5d 3d = false
            -5f 3i = false
            -5f 3i = false

            3i 3i = true
            3d 3d = true
            3f 3f = true

            3i -5i = true
            3d -5d = true
            3f -5f = true
            3i -5f = true
            3d -5f = true

            3i 3f = true
            3i 3d = true
            3d 3f = true
            -0f 0f = true

            INF INF = true
            -INF -INF = true
            INF 3f = true
            3f INF = false
            -INF 3f = false
            3f -INF = true
            `
            test('>=', table, undefined, argMap)
        });
    })

    describe('like bad lexical values', () => {
        // TODO: Add some bad lexical values for their datatype
        // https://www.w3.org/TR/sparql11-query/#operandDataTypes
    })
});