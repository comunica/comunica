import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {VersionContext} from "./ActorRdfResolveQuadPatternOstrich";
import {OstrichIterator} from "./OstrichIterator";

export class OstrichQuadSource implements ILazyQuadSource {

  protected bufferSize: number = 128;
  protected readonly ostrichDocument: any;
  protected versionContext: VersionContext = null;

  constructor(ostrichDocument: any, bufferSize?: number) {
    this.ostrichDocument = ostrichDocument;
    if (bufferSize) {
      this.bufferSize = bufferSize;
    }
  }

  public setVersionContext(versionContext: VersionContext) {
    this.versionContext = versionContext;
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
      throw new Error("OstrichQuadSource only supports triple pattern queries within the default graph.");
    }
    return new OstrichIterator(this.ostrichDocument, this.versionContext, subject, predicate, object,
      { autoStart: false, maxBufferSize: this.bufferSize });
  }
}
