import * as RDF from "../rdf-js";
import { BlankNode, DataFactory, DefaultGraph, Literal, NamedNode, Variable } from "rdf-data-model";
import { EventEmitter } from "events";

function test_terms() {
    // Only types are checked in this tests,
    // so this does not have to be functional.
    const someTerm: RDF.Term = <any> {};

    const namedNode: RDF.NamedNode = new NamedNode('http://example.org');
    console.log(namedNode.termType);
    console.log(namedNode.value);
    namedNode.equals(someTerm);

    const blankNode1: RDF.BlankNode = new BlankNode();
    const blankNode2: RDF.BlankNode = new BlankNode('b100');
    console.log(blankNode1.termType);
    console.log(blankNode1.value);
    blankNode1.equals(someTerm);

    const literal1: RDF.Literal = new Literal('abc', 'en-us');
    const literal2: RDF.Literal = new Literal('abc', 'en-us', namedNode);
    const literal3: RDF.Literal = new Literal('abc', undefined, namedNode);
    console.log(literal1.termType);
    console.log(literal1.value);
    console.log(literal1.language);
    console.log(literal1.datatype);
    literal1.equals(someTerm);

    const variable: RDF.Variable = new Variable('myvar');
    console.log(variable.termType);
    console.log(variable.value);
    variable.equals(someTerm);

    const defaultGraph: RDF.DefaultGraph = new DefaultGraph();
    console.log(defaultGraph.termType);
    console.log(defaultGraph.value);
    defaultGraph.equals(someTerm);
}

function test_datafactory() {
    const dataFactory: RDF.DataFactory = new DataFactory();

    const namedNode: RDF.NamedNode = dataFactory.namedNode('http://example.org');

    const blankNode1: RDF.BlankNode = dataFactory.blankNode('b1');
    const blankNode2: RDF.BlankNode = dataFactory.blankNode();

    const literal1: RDF.Literal = dataFactory.literal('abc');
    const literal2: RDF.Literal = dataFactory.literal('abc', 'en-us');
    const literal3: RDF.Literal = dataFactory.literal('abc', namedNode);

    const variable: RDF.Variable = dataFactory.variable ? dataFactory.variable('v1') : new Variable('myvar');

    const term: RDF.Term = <any> {};
    const triple: RDF.Quad = dataFactory.triple(term, term, term);
    const quad: RDF.Quad = dataFactory.quad(term, term, term, term);
}
