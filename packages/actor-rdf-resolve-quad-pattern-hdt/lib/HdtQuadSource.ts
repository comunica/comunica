import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {AsyncIterator} from "asynciterator";
import * as HDT from "hdt";
import * as RDF from "rdf-js";
import {HdtIterator} from "./HdtIterator";

export class HdtQuadSource implements ILazyQuadSource {

  protected bufferSize: number = 128;
  protected readonly hdtDocument: HDT.Document;

  constructor(hdtDocument: HDT.Document, bufferSize?: number) {
    this.hdtDocument = hdtDocument;
    if (bufferSize) {
      this.bufferSize = bufferSize;
    }
  }

  public match(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
               graph?: RDF.Term | RegExp): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

  public matchLazy?(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
                    graph?: RDF.Term | RegExp): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("HdtQuadSource does not support matching by regular expressions.");
    }
    if (graph && graph.termType !== 'DefaultGraph') {
      throw new Error("HdtQuadSource only supports triple pattern queries within the default graph.");
    }
    return new HdtIterator(this.hdtDocument, subject, predicate, object,
      { autoStart: false, maxBufferSize: this.bufferSize });
  }
}
