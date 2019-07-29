import { literal } from '@rdfjs/data-model';
import { termToString } from 'rdf-string';

// data ------------------------------------------------------------------------
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
// @prefix : <http://example.org/> .

// # numeric data
// :n1 :num -1 .
// :n2 :num -1.6 .
// :n3 :num 1.1 .
// :n4 :num -2 .
// :n5 :num 2.5 .
//
// # string data
// :s1 :str "foo" .
// :s2 :str "bar"@en .
// :s3 :str "BAZ" .
// :s4 :str "食べ物" .
// :s5 :str "100%" .
// :s6 :str "abc"^^xsd:string .
// :s7 :str "DEF"^^xsd:string .
//
// # date data
// :d1 :date "2010-06-21T11:28:01Z"^^xsd:dateTime .
// :d2 :date "2010-12-21T15:38:02-08:00"^^xsd:dateTime .
// :d3 :date "2008-06-20T23:59:00Z"^^xsd:dateTime .
// :d4 :date "2011-02-01T01:02:03"^^xsd:dateTime .

// https://raw.githubusercontent.com/w3c/rdf-tests/gh-pages/sparql11/data-sparql11/functions/data.ttl
export function data() {
  return {
    n1: int('-1'),
    n2: decimal('-1.6'),
    n3: decimal('1.1'),
    n4: int('-2'),
    n5: decimal('2.5'),

    s1: '"foo"',
    s2: '"bar"@en',
    s3: '"BAZ"',
    s4: '"食べ物"',
    s5: '"100%"',
    s6: '"abc"^^xsd:string',
    s7: '"DEF"^^xsd:string',

    d1: date('2010-06-21T11:28:01Z'),
    d2: date('2010-12-21T15:38:02-08:00'),
    d3: date('2008-06-20T23:59:00Z'),
    d4: date('2011-02-01T01:02:03'),

    dr1: date('2010-06-21'),
    dr2: date('2010-12-21'),
    dr3: date('2008-06-20'),
    dr4: date('2011-02-01'),
  };
}

// data 2 ----------------------------------------------------------------------
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
// @prefix : <http://example.org/> .
//
// :s1 :str "123" .
//
// :s2 :str "日本語"@ja .
// :s3 :str "english"@en .
// :s4 :str "français"@fr .
//
// :s5 :str "abc"^^xsd:string .
// :s6 :str "def"^^xsd:string .
//
// :s7 :str 7 .

// https://raw.githubusercontent.com/w3c/rdf-tests/gh-pages/sparql11/data-sparql11/functions/data2.ttl
export function data2() {
  return {
    s1: '"123"',
    s2: '"日本語"@ja',
    s3: '"english"@en',
    s4: '"français"@fr',
    s5: '"abc"^^xsd:string',
    s6: '"def"^^xsd:string',
    s7: int('7'),
  };
}

// data 3 ----------------------------------------------------------------------
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
// @prefix : <http://example.org/> .
//
// :s1 :str "123" .
// :s2 :str "日本語"@ja .
// :s3 :str "English"@en .
// :s4 :str "Français"@fr .
// :s5 :str "abc"^^xsd:string .
// :s6 :str "def"^^xsd:string .
// :s7 :str 7 .
// :s8 :str "banana" .
// :s9 :str "abcd" .

// https://raw.githubusercontent.com/w3c/rdf-tests/gh-pages/sparql11/data-sparql11/functions/data3.ttl

export function data3() {
  return {
    s1: '"123"',
    s2: '"日本語"@ja',
    s3: '"English"@en',
    s4: '"Français"@fr',
    s5: '"abc"^^xsd:string',
    s6: '"def"^^xsd:string',
    s7: int('7'),
    s8: '"banana"',
    s9: '"abcd"',
  };
}

// data 4 ----------------------------------------------------------------------
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
// @prefix : <http://example.org/> .
//
// :s1 :str "abc" .
// :s2 :str "abc"@en .
// :s3 :str "abc"^^xsd:string .

// https://github.com/w3c/rdf-tests/blob/gh-pages/sparql11/data-sparql11/functions/data4.ttl

export function data4() {
  return {
    s1: '"abc"',
    s2: '"abc"@en',
    s3: '"abc"^^xsd:string',
  };
}

// data builtin ----------------------------------------------------------------
// @prefix : <http://example/> .
// @prefix  xsd:    <http://www.w3.org/2001/XMLSchema#> .
//
// :x1 :p  "a" ; :q 1 .
// :x2 :p  _:b ; :q "1".
// :x3 :p  :a ; :q "1".
// :x4 :p  1 ; :q 2 .
// :x5 :p  1.0 ; :q 2 .
// :x6 :p  "1" ; :q "2" .
// :x7 :p  "1"^^xsd:string ; :q "2" .
// :x8 :p "1"^^xsd:string ; :q 2 .

export function dataBuiltin3() {
  return {
    x1p: '"a"',
    x1q: '1',
    // x2p: '"1"',
    x2q: '"1"',
    // x3p: '',
    x3q: '"1"',
    x4p: '1',
    x4q: '2',
    x5p: '1.0',
    x5q: '2',
    x6p: '"1"',
    x6q: '"2"',
    x7p: '"1"^^xsd:string',
    x7q: '"2"',
    x8p: '"1"^^xsd:string',
    x8q: '2',
  };
}

// hash unicode ----------------------------------------------------------------
// @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
// @prefix : <http://example.org/> .

// # string data
// :s8 :str "\u98DF" .

export function hashUnicode() {
  return {
    s8: '"\u98DF"',
  };
}

// helpers ---------------------------------------------------------------------

function int(value: string): string {
  return termToString(literal(value, 'xsd:integer'));
}

function float(value: string): string {
  return termToString(literal(value, 'xsd:float'));
}

function decimal(value: string): string {
  return termToString(literal(value, 'xsd:decimal'));
}

function double(value: string): string {
  return termToString(literal(value, 'xsd:double'));
}

function date(value: string): string {
  return termToString(literal(value, 'xsd:dateTime'));
}

function dateRaw(value: string): string {
  return termToString(literal(value, 'xsd:date'));
}
