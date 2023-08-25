import { dayTimeDurationTyped, durationTyped, yearMonthDurationTyped } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of XPath constructors', () => {
  describe('to string', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:string',
      testTable: `
        "http://example.org/z" = "http://example.org/z"
        <http://example.org/z> = "http://example.org/z"
        "true"^^xsd:boolean = "true"
        "false"^^xsd:boolean = "false"
        "1"^^xsd:boolean = "true"
        "0"^^xsd:boolean = "false"
        "1"^^xsd:integer = "1"
        "0.0"^^xsd:decimal = "0"
        "-1.0"^^xsd:decimal = "-1"
        "0E1"^^xsd:double = "0"
        "1E0"^^xsd:double = "1"
        "1E0"^^xsd:float = "1"
        "1.25"^^xsd:float = "1.25"
        "2.5"^^xsd:decimal = "2.5"
        "-2.5"^^xsd:decimal = "-2.5"
      `,
    });
  });

  describe('to float', () => {
    runTestTable({
      arity: 1,
      operation: 'xsd:float',
      notation: Notation.Function,
      testTable: `
        "-10.2E3" = "-10200"^^xsd:float'
        "+33.3300" = "33.33"^^xsd:float'
        "0.0" = "0"^^xsd:float'
        "0" = "0"^^xsd:float'
        "0E1" = "0"^^xsd:float'
        "1.5" = "1.5"^^xsd:float'
        "1" = "1"^^xsd:float'
        "1E0" = "1"^^xsd:float'
        "13" = "13"^^xsd:float'
        "true"^^xsd:boolean = "1"^^xsd:float'
        "false"^^xsd:boolean = "0"^^xsd:float'
        "1"^^xsd:boolean = "1"^^xsd:float'
        "0"^^xsd:boolean = "0"^^xsd:float'
        "0"^^xsd:integer = "0"^^xsd:float'
        "1"^^xsd:integer = "1"^^xsd:float'
        "-1"^^xsd:integer = "-1"^^xsd:float'
        "0.0"^^xsd:decimal = "0"^^xsd:float'
        "1.0"^^xsd:decimal = "1"^^xsd:float'
        "-1.0"^^xsd:decimal = "-1"^^xsd:float'
        "0E1"^^xsd:double = "0"^^xsd:float'
        "1E0"^^xsd:double = "1"^^xsd:float'
        "0.0"^^xsd:float = "0"^^xsd:float'
        "1.0"^^xsd:float = "1"^^xsd:float'
        "1.25"^^xsd:float = "1.25"^^xsd:float'
        "-7.875"^^xsd:float = "-7.875"^^xsd:float'
        "2.5"^^xsd:decimal = "2.5"^^xsd:float'
        "-2.5"^^xsd:decimal = "-2.5"^^xsd:float'
        "NaN" = "NaN"^^xsd:float'
        "INF" = "INF"^^xsd:float'
        "+INF" = "INF"^^xsd:float'
        "-INF" = "-INF"^^xsd:float'
      `,
      errorTable: `
        "http://example.org/z"^^xsd:string = ''
        "string"^^xsd:string = ''
        "2002-10-10T17:00:00Z"^^xsd:string = ''
        "true"^^xsd:string = ''
        "false"^^xsd:string = ''
        "foo"^^xsd:float = ''
      `,
    });
  });

  describe('to double', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:double',
      testTable: `
        "-10.2E3" = "-1.02E4"^^xsd:double
        "+33.3300" = "3.333E1"^^xsd:double
        "0.0" = "0.0E0"^^xsd:double
        "0" = "0.0E0"^^xsd:double
        "0E1" = "0.0E0"^^xsd:double
        "1.5" = "1.5E0"^^xsd:double
        "1" = "1.0E0"^^xsd:double
        "1E0" = "1.0E0"^^xsd:double
        "13" = "1.3E1"^^xsd:double
        "true"^^xsd:boolean = "1.0E0"^^xsd:double
        "false"^^xsd:boolean = "0.0E0"^^xsd:double
        "1"^^xsd:boolean = "1.0E0"^^xsd:double
        "0"^^xsd:boolean = "0.0E0"^^xsd:double
        "0"^^xsd:integer = "0.0E0"^^xsd:double
        "1"^^xsd:integer = "1.0E0"^^xsd:double
        "-1"^^xsd:integer = "-1.0E0"^^xsd:double
        "0.0"^^xsd:decimal = "0.0E0"^^xsd:double
        "1.0"^^xsd:decimal = "1.0E0"^^xsd:double
        "-1.0"^^xsd:decimal = "-1.0E0"^^xsd:double
        "0E1"^^xsd:double = "0.0E0"^^xsd:double
        "1E0"^^xsd:double = "1.0E0"^^xsd:double
        "0.0"^^xsd:float = "0.0E0"^^xsd:double
        "1.0"^^xsd:float = "1.0E0"^^xsd:double
        "1.25"^^xsd:float = "1.25E0"^^xsd:double
        "-7.875"^^xsd:float = "-7.875E0"^^xsd:double
        "2.5"^^xsd:decimal = "2.5E0"^^xsd:double
        "-2.5"^^xsd:decimal = "-2.5E0"^^xsd:double
        "NaN" = "NaN"^^xsd:double
        "INF" = "INF"^^xsd:double
        "+INF" = "INF"^^xsd:double
        "-INF" = "-INF"^^xsd:double
      `,
      errorTable: `
        "http://example.org/z"^^xsd:string = ''
        "string"^^xsd:string = ''
        "2002-10-10T17:00:00Z"^^xsd:string = ''
        "true"^^xsd:string = ''
        "false"^^xsd:string = ''
        "foo"^^xsd:double = ''
      `,
    });
  });

  describe('to decimal', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:decimal',
      testTable: `
        "+33.3300" = "33.33"^^xsd:decimal
        "0.0" = "0"^^xsd:decimal
        "0" = "0"^^xsd:decimal
        "1.5" = "1.5"^^xsd:decimal
        "1" = "1"^^xsd:decimal
        "13" = "13"^^xsd:decimal
        "true"^^xsd:boolean = "1"^^xsd:decimal
        "false"^^xsd:boolean = "0"^^xsd:decimal
        "1"^^xsd:boolean = "1"^^xsd:decimal
        "0"^^xsd:boolean = "0"^^xsd:decimal
        "0"^^xsd:integer = "0"^^xsd:decimal
        "1"^^xsd:integer = "1"^^xsd:decimal
        "-1"^^xsd:integer = "-1"^^xsd:decimal
        "0.0"^^xsd:decimal = "0"^^xsd:decimal
        "1.0"^^xsd:decimal = "1"^^xsd:decimal
        "-1.0"^^xsd:decimal = "-1"^^xsd:decimal
        "0.0"^^xsd:double = "0"^^xsd:decimal
        "1.0"^^xsd:double = "1"^^xsd:decimal
        "0E1"^^xsd:double = "0"^^xsd:decimal
        "1E0"^^xsd:double = "1"^^xsd:decimal
        "0E1"^^xsd:float = "0"^^xsd:decimal
        "1E0"^^xsd:float = "1"^^xsd:decimal
        "0.0"^^xsd:float = "0"^^xsd:decimal
        "1.0"^^xsd:float = "1"^^xsd:decimal
        "1.25"^^xsd:float = "1.25"^^xsd:decimal
        "-7.875"^^xsd:float = "-7.875"^^xsd:decimal
        "2.5"^^xsd:decimal = "2.5"^^xsd:decimal
        "-2.5"^^xsd:decimal = "-2.5"^^xsd:decimal
      `,
      errorTable: `
        "http://example.org/z"^^xsd:string = ''
        <http://example.org/z> = ''
        "string"^^xsd:string = ''
        "-10.2E3"^^xsd:string = ''
        "0E1"^^xsd:string = ''
        "1E0"^^xsd:string = ''
        "2002-10-10T17:00:00Z"^^xsd:string = ''
        "true"^^xsd:string = ''
        "false"^^xsd:string = ''
        "foo"^^xsd:decimal = ''
        "NaN"^^xsd:double = ''
        "+INF"^^xsd:double = ''
        "-INF"^^xsd:double = ''
      `,
    });
  });

  describe('to integer', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:integer',
      testTable: `
        "0" = "0"^^xsd:integer
        "1" = "1"^^xsd:integer
        "13" = "13"^^xsd:integer
        "true"^^xsd:boolean = "1"^^xsd:integer
        "false"^^xsd:boolean = "0"^^xsd:integer
        "1"^^xsd:boolean = "1"^^xsd:integer
        "0"^^xsd:boolean = "0"^^xsd:integer
        "0"^^xsd:integer = "0"^^xsd:integer
        "1"^^xsd:integer = "1"^^xsd:integer
        "-1"^^xsd:integer = "-1"^^xsd:integer
        "0.0"^^xsd:decimal = "0"^^xsd:integer
        "1.0"^^xsd:decimal = "1"^^xsd:integer
        "-1.0"^^xsd:decimal = "-1"^^xsd:integer
        "0E1"^^xsd:double = "0"^^xsd:integer
        "1E0"^^xsd:double = "1"^^xsd:integer
        "0.0"^^xsd:float = "0"^^xsd:integer
        "1.0"^^xsd:float = "1"^^xsd:integer
        "1.25"^^xsd:float = "1"^^xsd:integer
        "-7.875"^^xsd:float = "-7"^^xsd:integer
        "2.5"^^xsd:decimal = "2"^^xsd:integer
        "-2.5"^^xsd:decimal = "-2"^^xsd:integer
      `,
      errorTable: `
        "-10.2E3"^^xsd:string = ''
        "+33.3300"^^xsd:string = ''
        "0.0"^^xsd:string = ''
        "0E1"^^xsd:string = ''
        "1.5"^^xsd:string = ''
        "1E0"^^xsd:string = ''
        "2002-10-10T17:00:00Z"^^xsd:string = ''
        "false"^^xsd:string = ''
        "true"^^xsd:string = ''
        "foo"^^xsd:integer = ''
        "NaN"^^xsd:double = ''
        "+INF"^^xsd:double = ''
        "-INF"^^xsd:double = ''
      `,
    });
  });

  describe('to dateTime', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:dateTime',
      testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "1999-03-17T06:00:00Z"^^xsd:dateTime
        "1999-03-17T06:00:00Z" = "1999-03-17T06:00:00Z"^^xsd:dateTime
        "1999-03-17T06:00:00+02:30" = "1999-03-17T06:00:00+02:30"^^xsd:dateTime
        "1999-03-17T06:00:00" = "1999-03-17T06:00:00"^^xsd:dateTime
        
        "1999-03-17Z"^^xsd:date = "1999-03-17T00:00:00Z"^^xsd:dateTime
        "1999-03-17"^^xsd:date = "1999-03-17T00:00:00"^^xsd:dateTime 
        "1999-03-17+07:25"^^xsd:date = "1999-03-17T00:00:00+07:25"^^xsd:dateTime
        "1999-03-17-07:25"^^xsd:date = "1999-03-17T00:00:00-07:25"^^xsd:dateTime
      `,
      errorTable: `
        "foo" = ''
        "1234567789"^^xsd:integer = ''
        "foo"^^xsd:dateTime = ''
        "1999-03-17" = ''
      `,
    });
  });

  describe('to boolean', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:boolean',
      testTable: `
        "0" = "false"^^xsd:boolean
        "1" = "true"^^xsd:boolean
        "false" = "false"^^xsd:boolean
        "true" = "true"^^xsd:boolean
        "0"^^xsd:boolean = "false"^^xsd:boolean
        "1"^^xsd:boolean = "true"^^xsd:boolean
        "false"^^xsd:boolean = "false"^^xsd:boolean
        "true"^^xsd:boolean = "true"^^xsd:boolean
        "0"^^xsd:integer = "false"^^xsd:boolean
        "1"^^xsd:integer = "true"^^xsd:boolean
        "-1"^^xsd:integer = "true"^^xsd:boolean
        "0.0"^^xsd:decimal = "false"^^xsd:boolean
        "1.0"^^xsd:decimal = "true"^^xsd:boolean
        "-1.0"^^xsd:decimal = "true"^^xsd:boolean
        "0E1"^^xsd:double = "false"^^xsd:boolean
        "1E0"^^xsd:double = "true"^^xsd:boolean
        "0E1"^^xsd:float = "false"^^xsd:boolean
        "1E0"^^xsd:float = "true"^^xsd:boolean
        "1.25"^^xsd:float = "true"^^xsd:boolean
        "-7.875"^^xsd:float = "true"^^xsd:boolean
        "2.5"^^xsd:decimal = "true"^^xsd:boolean
        "-2.5"^^xsd:decimal = "true"^^xsd:boolean
      `,
      errorTable: `
        "http://example.org/z"^^xsd:string = ''
        "string"^^xsd:string = ''
        "-10.2E3"^^xsd:string = ''
        "+33.3300"^^xsd:string = ''
        "0.0"^^xsd:string = ''
        "0E1"^^xsd:string = ''
        "1.5"^^xsd:string = ''
        "1E0"^^xsd:string = ''
        "2002-10-10T17:00:00Z"^^xsd:string = ''
        "foo"^^xsd:boolean = ''
      `,
    });
  });

  describe('to date', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:date',
      testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "1999-03-17Z"^^xsd:date
        "1999-03-17T06:00:00"^^xsd:dateTime = "1999-03-17"^^xsd:date
        "1999-03-17T06:00:00+07:25"^^xsd:dateTime = "1999-03-17+07:25"^^xsd:date
        "1999-03-17T06:00:00-07:25"^^xsd:dateTime = "1999-03-17-07:25"^^xsd:date
        
        "1999-03-17"^^xsd:date = "1999-03-17"^^xsd:date
        "1999-03-17Z"^^xsd:date = "1999-03-17Z"^^xsd:date
      `,
      errorTable: `
        "1999-03-17ZZ"^^xsd:date = ''
      `,
    });
  });

  describe('to time', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:time',
      testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "06:00:00Z"^^xsd:time
        "1999-03-17T06:00:00"^^xsd:dateTime = "06:00:00"^^xsd:time
        "1999-03-17T06:00:00+07:25"^^xsd:dateTime = "06:00:00+07:25"^^xsd:time
        "1999-03-17T06:00:00-07:25"^^xsd:dateTime = "06:00:00-07:25"^^xsd:time
        
        "06:00:00+07:25"^^xsd:time = "06:00:00+07:25"^^xsd:time
        "06:00:00"^^xsd:time = "06:00:00"^^xsd:time
      `,
      errorTable: `
        "06:00:00Z+00:00"^^xsd:time = ''
      `,
    });
  });

  describe('to duration', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:duration',
      testTable: `
        ${durationTyped('-PT10H')} = ${durationTyped('-PT10H')}
      `,
    });
  });

  describe('to yearMonthDuration', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:yearMonthDuration',
      testTable: `
        ${durationTyped('-PT10H')} = ${yearMonthDurationTyped('P0M')}
        ${durationTyped('-P5Y6M')} = ${yearMonthDurationTyped('-P5Y6M')}
        '"P5Y30M"' = ${yearMonthDurationTyped('P7Y6M')}
        ${dayTimeDurationTyped('P1DT1H1M1.1S')} = ${yearMonthDurationTyped('P0M')}
      `,
      errorTable: `
        '"-PT10H"' = ''
      `,
    });
  });

  describe('to dayTimeDuration', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:dayTimeDuration',
      testTable: `
        ${durationTyped('-PT10H')} = ${dayTimeDurationTyped('-PT10H')}
        ${durationTyped('PT5S')} = ${dayTimeDurationTyped('PT5S')}
        '"-PT10H"' = '${dayTimeDurationTyped('-PT10H')}'
        '${yearMonthDurationTyped('-P5Y2M')}' = '${dayTimeDurationTyped('PT0S')}'
      `,
      errorTable: `
        '"P5Y30M"' = ''
      `,
    });
  });
});
