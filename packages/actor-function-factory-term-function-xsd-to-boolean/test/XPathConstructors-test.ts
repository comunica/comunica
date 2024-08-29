import { ActorFunctionFactoryTermFunctionXsdToDate } from '@comunica/actor-function-factory-term-function-xsd-to-date';
import {
  ActorFunctionFactoryTermFunctionXsdToDatetime,
} from '@comunica/actor-function-factory-term-function-xsd-to-datetime';
import {
  ActorFunctionFactoryTermFunctionXsdToDayTimeDuration,
} from '@comunica/actor-function-factory-term-function-xsd-to-day-time-duration';
import {
  ActorFunctionFactoryTermFunctionXsdToDecimal,
} from '@comunica/actor-function-factory-term-function-xsd-to-decimal';
import {
  ActorFunctionFactoryTermFunctionXsdToDouble,
} from '@comunica/actor-function-factory-term-function-xsd-to-double';
import {
  ActorFunctionFactoryTermFunctionXsdToDuration,
} from '@comunica/actor-function-factory-term-function-xsd-to-duration';
import { ActorFunctionFactoryTermFunctionXsdToFloat } from '@comunica/actor-function-factory-term-function-xsd-to-float';
import {
  ActorFunctionFactoryTermFunctionXsdToInteger,
} from '@comunica/actor-function-factory-term-function-xsd-to-integer';
import {
  ActorFunctionFactoryTermFunctionXsdToString,
} from '@comunica/actor-function-factory-term-function-xsd-to-string';
import { ActorFunctionFactoryTermFunctionXsdToTime } from '@comunica/actor-function-factory-term-function-xsd-to-time';
import {
  ActorFunctionFactoryTermFunctionXsdToYearMonthDuration,
} from '@comunica/actor-function-factory-term-function-xsd-to-year-month-duration';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  dayTimeDurationTyped,
  durationTyped,
  yearMonthDurationTyped,
} from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToBoolean } from '../lib';

describe('evaluation of XPath constructors', () => {
  describe('to string', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToString(args),
      ],
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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToFloat(args),
      ],
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
        "http://example.org/z"^^xsd:string = 'Argument types not valid for operator'
        "string"^^xsd:string = 'Argument types not valid for operator'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Argument types not valid for operator'
        "true"^^xsd:string = 'Argument types not valid for operator'
        "false"^^xsd:string = 'Argument types not valid for operator'
        "foo"^^xsd:float = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to double', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDouble(args),
      ],
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
        "http://example.org/z"^^xsd:string = 'Argument types not valid for operator'
        "string"^^xsd:string = 'Argument types not valid for operator'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Argument types not valid for operator'
        "true"^^xsd:string = 'Argument types not valid for operator'
        "false"^^xsd:string = 'Argument types not valid for operator'
        "foo"^^xsd:double = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to decimal', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDecimal(args),
      ],
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
        "http://example.org/z"^^xsd:string = 'Argument types not valid for operator'
        <http://example.org/z> = 'Argument types not valid for operator'
        "string"^^xsd:string = 'Argument types not valid for operator'
        "-10.2E3"^^xsd:string = 'Argument types not valid for operator'
        "0E1"^^xsd:string = 'Argument types not valid for operator'
        "1E0"^^xsd:string = 'Argument types not valid for operator'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Argument types not valid for operator'
        "true"^^xsd:string = 'Argument types not valid for operator'
        "false"^^xsd:string = 'Argument types not valid for operator'
        "foo"^^xsd:decimal = 'Argument types not valid for operator'
        "NaN"^^xsd:double = 'Argument types not valid for operator'
        "+INF"^^xsd:double = 'Argument types not valid for operator'
        "-INF"^^xsd:double = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to integer', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToInteger(args),
      ],
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
        "-10.2E3"^^xsd:string = 'Argument types not valid for operator'
        "+33.3300"^^xsd:string = 'Argument types not valid for operator'
        "0.0"^^xsd:string = 'Argument types not valid for operator'
        "0E1"^^xsd:string = 'Argument types not valid for operator'
        "1.5"^^xsd:string = 'Argument types not valid for operator'
        "1E0"^^xsd:string = 'Argument types not valid for operator'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Argument types not valid for operator'
        "false"^^xsd:string = 'Argument types not valid for operator'
        "true"^^xsd:string = 'Argument types not valid for operator'
        "foo"^^xsd:integer = 'Argument types not valid for operator'
        "NaN"^^xsd:double = 'Argument types not valid for operator'
        "+INF"^^xsd:double = 'Argument types not valid for operator'
        "-INF"^^xsd:double = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to dateTime', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDatetime(args),
      ],
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
        "1234567789"^^xsd:integer = 'Argument types not valid for operator'
        "foo"^^xsd:dateTime = 'Argument types not valid for operator'
        "1999-03-17" = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to boolean', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToBoolean(args),
      ],
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
        "http://example.org/z"^^xsd:string = 'Argument types not valid for operator'
        "string"^^xsd:string = 'Argument types not valid for operator'
        "-10.2E3"^^xsd:string = 'Argument types not valid for operator'
        "+33.3300"^^xsd:string = 'Argument types not valid for operator'
        "0.0"^^xsd:string = 'Argument types not valid for operator'
        "0E1"^^xsd:string = 'Argument types not valid for operator'
        "1.5"^^xsd:string = 'Argument types not valid for operator'
        "1E0"^^xsd:string = 'Argument types not valid for operator'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Argument types not valid for operator'
        "foo"^^xsd:boolean = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to date', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDate(args),
      ],
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
        "1999-03-17ZZ"^^xsd:date = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to time', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToTime(args),
      ],
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
        "06:00:00Z+00:00"^^xsd:time = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to duration', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDuration(args),
      ],
      arity: 1,
      notation: Notation.Function,
      operation: 'xsd:duration',
      testTable: `
        ${durationTyped('-PT10H')} = ${durationTyped('-PT10H')}
      `,
    });
  });

  describe('to yearMonthDuration', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToYearMonthDuration(args),
      ],
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
        '"-PT10H"' = 'Argument types not valid for operator'
      `,
    });
  });

  describe('to dayTimeDuration', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionXsdToDayTimeDuration(args),
      ],
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
        '"P5Y30M"' = 'Argument types not valid for operator'
      `,
    });
  });
});
