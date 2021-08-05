import { testAll, testAllErrors } from '../util/utils';

describe('evaluation of XPath constructors', () => {
  describe('to string', () => {
    testAll([
      'xsd:string("http://example.org/z") = "http://example.org/z"',
      'xsd:string(<http://example.org/z>) = "http://example.org/z"',
      'xsd:string("true"^^xsd:boolean) = "true"',
      'xsd:string("false"^^xsd:boolean) = "false"',
      'xsd:string("1"^^xsd:boolean) = "true"',
      'xsd:string("0"^^xsd:boolean) = "false"',
      'xsd:string("1"^^xsd:integer) = "1"',
      'xsd:string("0.0"^^xsd:decimal) = "0"',
      'xsd:string("-1.0"^^xsd:decimal) = "-1"',
      'xsd:string("0E1"^^xsd:double) = "0"',
      'xsd:string("1E0"^^xsd:double) = "1"',
      'xsd:string("1E0"^^xsd:float) = "1"',
      'xsd:string("1.25"^^xsd:float) = "1.25"',
      'xsd:string("2.5"^^xsd:decimal) = "2.5"',
      'xsd:string("-2.5"^^xsd:decimal) = "-2.5"',
    ]);
  });

  describe('to float', () => {
    testAll([
      'xsd:float("-10.2E3") = "-10200"^^xsd:float',
      'xsd:float("+33.3300") = "33.33"^^xsd:float',
      'xsd:float("0.0") = "0"^^xsd:float',
      'xsd:float("0") = "0"^^xsd:float',
      'xsd:float("0E1") = "0"^^xsd:float',
      'xsd:float("1.5") = "1.5"^^xsd:float',
      'xsd:float("1") = "1"^^xsd:float',
      'xsd:float("1E0") = "1"^^xsd:float',
      'xsd:float("13") = "13"^^xsd:float',
      'xsd:float("true"^^xsd:boolean) = "1"^^xsd:float',
      'xsd:float("false"^^xsd:boolean) = "0"^^xsd:float',
      'xsd:float("1"^^xsd:boolean) = "1"^^xsd:float',
      'xsd:float("0"^^xsd:boolean) = "0"^^xsd:float',
      'xsd:float("0"^^xsd:integer) = "0"^^xsd:float',
      'xsd:float("1"^^xsd:integer) = "1"^^xsd:float',
      'xsd:float("-1"^^xsd:integer) = "-1"^^xsd:float',
      'xsd:float("0.0"^^xsd:decimal) = "0"^^xsd:float',
      'xsd:float("1.0"^^xsd:decimal) = "1"^^xsd:float',
      'xsd:float("-1.0"^^xsd:decimal) = "-1"^^xsd:float',
      'xsd:float("0E1"^^xsd:double) = "0"^^xsd:float',
      'xsd:float("1E0"^^xsd:double) = "1"^^xsd:float',
      'xsd:float("0.0"^^xsd:float) = "0"^^xsd:float',
      'xsd:float("1.0"^^xsd:float) = "1"^^xsd:float',
      'xsd:float("1.25"^^xsd:float) = "1.25"^^xsd:float',
      'xsd:float("-7.875"^^xsd:float) = "-7.875"^^xsd:float',
      'xsd:float("2.5"^^xsd:decimal) = "2.5"^^xsd:float',
      'xsd:float("-2.5"^^xsd:decimal) = "-2.5"^^xsd:float',
    ]);
    testAllErrors([
      'xsd:float("http://example.org/z"^^xsd:string) = error',
      'xsd:float("string"^^xsd:string) = error',
      'xsd:float("2002-10-10T17:00:00Z"^^xsd:string) = error',
      'xsd:float("true"^^xsd:string) = error',
      'xsd:float("false"^^xsd:string) = error',
    ]);
  });

  describe('to double', () => {
    testAll([
      'xsd:double("-10.2E3") = "-1.02E4"^^xsd:double',
      'xsd:double("+33.3300") = "3.333E1"^^xsd:double',
      'xsd:double("0.0") = "0.0E0"^^xsd:double',
      'xsd:double("0") = "0.0E0"^^xsd:double',
      'xsd:double("0E1") = "0.0E0"^^xsd:double',
      'xsd:double("1.5") = "1.5E0"^^xsd:double',
      'xsd:double("1") = "1.0E0"^^xsd:double',
      'xsd:double("1E0") = "1.0E0"^^xsd:double',
      'xsd:double("13") = "1.3E1"^^xsd:double',
      'xsd:double("true"^^xsd:boolean) = "1.0E0"^^xsd:double',
      'xsd:double("false"^^xsd:boolean) = "0.0E0"^^xsd:double',
      'xsd:double("1"^^xsd:boolean) = "1.0E0"^^xsd:double',
      'xsd:double("0"^^xsd:boolean) = "0.0E0"^^xsd:double',
      'xsd:double("0"^^xsd:integer) = "0.0E0"^^xsd:double',
      'xsd:double("1"^^xsd:integer) = "1.0E0"^^xsd:double',
      'xsd:double("-1"^^xsd:integer) = "-1.0E0"^^xsd:double',
      'xsd:double("0.0"^^xsd:decimal) = "0.0E0"^^xsd:double',
      'xsd:double("1.0"^^xsd:decimal) = "1.0E0"^^xsd:double',
      'xsd:double("-1.0"^^xsd:decimal) = "-1.0E0"^^xsd:double',
      'xsd:double("0E1"^^xsd:double) = "0.0E0"^^xsd:double',
      'xsd:double("1E0"^^xsd:double) = "1.0E0"^^xsd:double',
      'xsd:double("0.0"^^xsd:float) = "0.0E0"^^xsd:double',
      'xsd:double("1.0"^^xsd:float) = "1.0E0"^^xsd:double',
      'xsd:double("1.25"^^xsd:float) = "1.25E0"^^xsd:double',
      'xsd:double("-7.875"^^xsd:float) = "-7.875E0"^^xsd:double',
      'xsd:double("2.5"^^xsd:decimal) = "2.5E0"^^xsd:double',
      'xsd:double("-2.5"^^xsd:decimal) = "-2.5E0"^^xsd:double',
    ]);
    testAllErrors([
      'xsd:double("http://example.org/z"^^xsd:string) = error',
      'xsd:double("string"^^xsd:string) = error',
      'xsd:double("2002-10-10T17:00:00Z"^^xsd:string) = error',
      'xsd:double("true"^^xsd:string) = error',
      'xsd:double("false"^^xsd:string) = error',
    ]);
  });

  describe('to decimal', () => {
    testAll([
      'xsd:decimal("+33.3300") = "33.33"^^xsd:decimal',
      'xsd:decimal("0.0") = "0"^^xsd:decimal',
      'xsd:decimal("0") = "0"^^xsd:decimal',
      'xsd:decimal("1.5") = "1.5"^^xsd:decimal',
      'xsd:decimal("1") = "1"^^xsd:decimal',
      'xsd:decimal("13") = "13"^^xsd:decimal',
      'xsd:decimal("true"^^xsd:boolean) = "1"^^xsd:decimal',
      'xsd:decimal("false"^^xsd:boolean) = "0"^^xsd:decimal',
      'xsd:decimal("1"^^xsd:boolean) = "1"^^xsd:decimal',
      'xsd:decimal("0"^^xsd:boolean) = "0"^^xsd:decimal',
      'xsd:decimal("0"^^xsd:integer) = "0"^^xsd:decimal',
      'xsd:decimal("1"^^xsd:integer) = "1"^^xsd:decimal',
      'xsd:decimal("-1"^^xsd:integer) = "-1"^^xsd:decimal',
      'xsd:decimal("0.0"^^xsd:decimal) = "0"^^xsd:decimal',
      'xsd:decimal("1.0"^^xsd:decimal) = "1"^^xsd:decimal',
      'xsd:decimal("-1.0"^^xsd:decimal) = "-1"^^xsd:decimal',
      'xsd:decimal("0.0"^^xsd:double) = "0"^^xsd:decimal',
      'xsd:decimal("1.0"^^xsd:double) = "1"^^xsd:decimal',
      'xsd:decimal("0E1"^^xsd:double) = "0"^^xsd:decimal',
      'xsd:decimal("1E0"^^xsd:double) = "1"^^xsd:decimal',
      'xsd:decimal("0E1"^^xsd:float) = "0"^^xsd:decimal',
      'xsd:decimal("1E0"^^xsd:float) = "1"^^xsd:decimal',
      'xsd:decimal("0.0"^^xsd:float) = "0"^^xsd:decimal',
      'xsd:decimal("1.0"^^xsd:float) = "1"^^xsd:decimal',
      'xsd:decimal("1.25"^^xsd:float) = "1.25"^^xsd:decimal',
      'xsd:decimal("-7.875"^^xsd:float) = "-7.875"^^xsd:decimal',
      'xsd:decimal("2.5"^^xsd:decimal) = "2.5"^^xsd:decimal',
      'xsd:decimal("-2.5"^^xsd:decimal) = "-2.5"^^xsd:decimal',
    ]);
    testAllErrors([
      'xsd:decimal("http://example.org/z"^^xsd:string) = error',
      'xsd:decimal(<http://example.org/z>) = error',
      'xsd:decimal("string"^^xsd:string) = error',
      'xsd:decimal("-10.2E3"^^xsd:string) = error',
      'xsd:decimal("0E1"^^xsd:string) = error',
      'xsd:decimal("1E0"^^xsd:string) = error',
      'xsd:decimal("2002-10-10T17:00:00Z"^^xsd:string) = error',
      'xsd:decimal("true"^^xsd:string) = error',
      'xsd:decimal("false"^^xsd:string) = error',
    ]);
  });

  describe('to integer', () => {
    testAll([
      'xsd:integer("0") = "0"^^xsd:integer',
      'xsd:integer("1") = "1"^^xsd:integer',
      'xsd:integer("13") = "13"^^xsd:integer',
      'xsd:integer("true"^^xsd:boolean) = "1"^^xsd:integer',
      'xsd:integer("false"^^xsd:boolean) = "0"^^xsd:integer',
      'xsd:integer("1"^^xsd:boolean) = "1"^^xsd:integer',
      'xsd:integer("0"^^xsd:boolean) = "0"^^xsd:integer',
      'xsd:integer("0"^^xsd:integer) = "0"^^xsd:integer',
      'xsd:integer("1"^^xsd:integer) = "1"^^xsd:integer',
      'xsd:integer("-1"^^xsd:integer) = "-1"^^xsd:integer',
      'xsd:integer("0.0"^^xsd:decimal) = "0"^^xsd:integer',
      'xsd:integer("1.0"^^xsd:decimal) = "1"^^xsd:integer',
      'xsd:integer("-1.0"^^xsd:decimal) = "-1"^^xsd:integer',
      'xsd:integer("0E1"^^xsd:double) = "0"^^xsd:integer',
      'xsd:integer("1E0"^^xsd:double) = "1"^^xsd:integer',
      'xsd:integer("0.0"^^xsd:float) = "0"^^xsd:integer',
      'xsd:integer("1.0"^^xsd:float) = "1"^^xsd:integer',
      'xsd:integer("1.25"^^xsd:float) = "1"^^xsd:integer',
      'xsd:integer("-7.875"^^xsd:float) = "-7"^^xsd:integer',
      'xsd:integer("2.5"^^xsd:decimal) = "2"^^xsd:integer',
      'xsd:integer("-2.5"^^xsd:decimal) = "-2"^^xsd:integer',
    ]);
    testAllErrors([
      'xsd:integer("-10.2E3"^^xsd:string) = error',
      'xsd:integer("+33.3300"^^xsd:string) = error',
      'xsd:integer("0.0"^^xsd:string) = error',
      'xsd:integer("0E1"^^xsd:string) = error',
      'xsd:integer("1.5"^^xsd:string) = error',
      'xsd:integer("1E0"^^xsd:string) = error',
      'xsd:integer("2002-10-10T17:00:00Z"^^xsd:string) = error',
      'xsd:integer("false"^^xsd:string) = error',
      'xsd:integer("true"^^xsd:string) = error',
    ]);
  });

  describe('to dateTime', () => {
    testAll([
      'xsd:dateTime("1999-03-17T06:00:00Z") = "1999-03-17T06:00:00Z"^^xsd:dateTime',
    ]);
  });

  describe('to boolean', () => {
    testAll([
      'xsd:boolean("0") = "false"^^xsd:boolean',
      'xsd:boolean("1") = "true"^^xsd:boolean',
      'xsd:boolean("false") = "false"^^xsd:boolean',
      'xsd:boolean("true") = "true"^^xsd:boolean',
      'xsd:boolean("0"^^xsd:boolean) = "false"^^xsd:boolean',
      'xsd:boolean("1"^^xsd:boolean) = "true"^^xsd:boolean',
      'xsd:boolean("false"^^xsd:boolean) = "false"^^xsd:boolean',
      'xsd:boolean("true"^^xsd:boolean) = "true"^^xsd:boolean',
      'xsd:boolean("0"^^xsd:integer) = "false"^^xsd:boolean',
      'xsd:boolean("1"^^xsd:integer) = "true"^^xsd:boolean',
      'xsd:boolean("-1"^^xsd:integer) = "true"^^xsd:boolean',
      'xsd:boolean("0.0"^^xsd:decimal) = "false"^^xsd:boolean',
      'xsd:boolean("1.0"^^xsd:decimal) = "true"^^xsd:boolean',
      'xsd:boolean("-1.0"^^xsd:decimal) = "true"^^xsd:boolean',
      'xsd:boolean("0E1"^^xsd:double) = "false"^^xsd:boolean',
      'xsd:boolean("1E0"^^xsd:double) = "true"^^xsd:boolean',
      'xsd:boolean("0E1"^^xsd:float) = "false"^^xsd:boolean',
      'xsd:boolean("1E0"^^xsd:float) = "true"^^xsd:boolean',
      'xsd:boolean("1.25"^^xsd:float) = "true"^^xsd:boolean',
      'xsd:boolean("-7.875"^^xsd:float) = "true"^^xsd:boolean',
      'xsd:boolean("2.5"^^xsd:decimal) = "true"^^xsd:boolean',
      'xsd:boolean("-2.5"^^xsd:decimal) = "true"^^xsd:boolean',
    ]);
    testAllErrors([
      'xsd:boolean("http://example.org/z"^^xsd:string) = error',
      'xsd:boolean("string"^^xsd:string) = error',
      'xsd:boolean("-10.2E3"^^xsd:string) = error',
      'xsd:boolean("+33.3300"^^xsd:string) = error',
      'xsd:boolean("0.0"^^xsd:string) = error',
      'xsd:boolean("0E1"^^xsd:string) = error',
      'xsd:boolean("1.5"^^xsd:string) = error',
      'xsd:boolean("1E0"^^xsd:string) = error',
      'xsd:boolean("2002-10-10T17:00:00Z"^^xsd:string) = error',
    ]);
  });
});
