import { aliases as a, testAll } from '../util/utils';

describe('evaluation of \'strlen\' like', () => {
  testAll([
    'strlen("aaa")            = "3"^^xsd:integer',
    'strlen("aaaa"@en)        = "4"^^xsd:integer',
    'strlen("aa"^^xsd:string) = "2"^^xsd:integer',
    'strlen("👪"^^xsd:string)  = "1"^^xsd:integer',
    'strlen("👨‍👩‍👧‍👦"^^xsd:string)  = "7"^^xsd:integer',
  ]);
});

// TODO: Add errors for when non BCP47 strings are passed
describe('evaluation of \'langMatches\' like', () => {
  testAll([
    `langMatches("de-DE", "de-*-DE")           = ${a.true}`,
    `langMatches("de-de", "de-*-DE")           = ${a.true}`,
    `langMatches("de-Latn-DE", "de-*-DE")      = ${a.true}`,
    `langMatches("de-Latf-DE", "de-*-DE")      = ${a.true}`,
    `langMatches("de-DE-x-goethe", "de-*-DE")  = ${a.true}`,
    `langMatches("de-Latn-DE-1996", "de-*-DE") = ${a.true}`,

    `langMatches("de", "de-*-DE")      = ${a.false}`,
    `langMatches("de-X-De", "de-*-DE") = ${a.false}`,
    `langMatches("de-Deva", "de-*-DE") = ${a.false}`,
  ]);
});

describe('evaluations of \'substr\' like', () => {
  testAll([
    'substr("bar", 1, 1) = "b"',
    'substr("bar", 2) = "ar"',
    'substr("👪", 2) = ""',
    'substr("👨‍👩‍👧‍👦", 2) = "‍👩‍👧‍👦"',
    'substr("👪", 1, 1) = "👪"',
    'substr("👨‍👩‍👧‍👦", 1, 1) = "👨"',
    'substr("bar"@en, 1, 1) = "b"@en',
    'substr("bar"@en, 2) = "ar"@en',
    'substr("👪"@en, 2) = ""@en',
    'substr("👨‍👩‍👧‍👦"@en, 2) = "‍👩‍👧‍👦"@en',
    'substr("👪"@en, 1, 1) = "👪"@en',
    'substr("👨‍👩‍👧‍👦"@en, 1, 1) = "👨"@en',
  ]);
});

describe('evaluation of \'regex\' like', () => {
  // TODO: Test better
  testAll([
    `regex("simple", "simple") = ${a.true}`,
    `regex("aaaaaa", "a")      = ${a.true}`,

    `regex("simple", "blurgh") = ${a.false}`,
  ]);
});
