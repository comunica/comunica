import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import * as DataFactory from "@rdfjs/data-model";
import {AsyncIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES, TRIPLE_TERM_NAMES} from "rdf-terms";

/**
 * A QPF quad source that uses a paged RDF dereference mediator
 * and a quad pattern to URL constructor
 * to acts as an RDFJS source.
 *
 * @see RDF.Source
 */
export class MediatedQuadSource implements ILazyQuadSource {

  public readonly mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
    IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  public readonly uriConstructor: ((subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
    => Promise<string>);
  public readonly context: ActionContext;

  constructor(mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>,
              uriConstructor: ((subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
                => Promise<string>),
              context: ActionContext) {
    this.mediatorRdfDereferencePaged = mediatorRdfDereferencePaged;
    this.uriConstructor = uriConstructor;
    this.context = context;
  }

  /**
   * Check if the given pattern matches with the given quad.
   * @param {Quad} pattern A quad pattern.
   * @param {Quad} quad A quad.
   * @return {boolean} If they match.
   */
  public static matchPattern(pattern: RDF.Quad, quad: RDF.Quad): boolean {
    for (const termName of QUAD_TERM_NAMES) {
      const patternTerm: RDF.Term = (<any> pattern)[termName];
      if (patternTerm && patternTerm.termType !== 'BlankNode' && patternTerm.termType !== 'Variable') {
        const quadTerm: RDF.Term = (<any> quad)[termName];
        if (!patternTerm.equals(quadTerm)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * A helper function to find a hash with quad elements that have duplicate variables.
   *
   * @param {RDF.Term} subject An optional subject term.
   * @param {RDF.Term} predicate An optional predicate term.
   * @param {RDF.Term} object An optional object term.
   * @param {RDF.Term} graph An optional graph term.
   *
   * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns null.
   *                                   Otherwise, this maps quad elements ('subject', 'predicate', 'object', 'graph')
   *                                   to the list of quad elements it shares a variable name with.
   *                                   If no links for a certain element exist, this element will
   *                                   not be included in the hash.
   *                                   Note 1: Quad elements will never have a link to themselves.
   *                                           So this can never occur: { subject: [ 'subject'] },
   *                                           instead 'null' would be returned.
   *                                   Note 2: Links only exist in one direction,
   *                                           this means that { subject: [ 'predicate'], predicate: [ 'subject' ] }
   *                                           will not occur, instead only { subject: [ 'predicate'] }
   *                                           will be returned.
   */
  public getDuplicateElementLinks(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
  : {[element: string]: string[]} {
    // Collect a variable to quad elements mapping.
    const variableElements: {[variableName: string]: string[]} = {};
    let duplicateVariables = false;
    const input: { [id: string]: RDF.Term } = { subject, predicate, object, graph };
    for (const key of Object.keys(input)) {
      if (input[key] && (input[key].termType === 'Variable' || input[key].termType === 'BlankNode')) {
        const val = termToString(input[key]);
        const length = (variableElements[val] || (variableElements[val] = [])).push(key);
        duplicateVariables = duplicateVariables || length > 1;
      }
    }

    if (!duplicateVariables) {
      return null;
    }

    // Collect quad element to elements with equal variables mapping.
    const duplicateElementLinks: {[element: string]: string[]} = {};
    for (const variable in variableElements) {
      const elements = variableElements[variable];
      const remainingElements = elements.slice(1);
      // Only store the elements that have at least one equal element.
      if (remainingElements.length) {
        duplicateElementLinks[elements[0]] = remainingElements;
      }
    }

    return duplicateElementLinks;
  }

  public matchLazy(subject?: RegExp | RDF.Term,
                   predicate?: RegExp | RDF.Term,
                   object?: RegExp | RDF.Term,
                   graph?: RegExp | RDF.Term): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("MediatedQuadSource does not support matching by regular expressions.");
    }

    const quads = new PromiseProxyIterator(async () => {
      const url: string = await this.uriConstructor(subject, predicate, object, graph);
      const output = await this.mediatorRdfDereferencePaged.mediate({ context: this.context, url });

      // Emit metadata in the stream, so we can attach it later to the actor's promise output
      quads.emit('metadata', output.firstPageMetadata);

      // The server is free to send any data in its response (such as metadata),
      // including quads that do not match the given matter.
      // Therefore, we have to filter away all non-matching quads here.
      let filteredOutput = output.data.filter(MediatedQuadSource.matchPattern.bind(null,
        DataFactory.quad(subject, predicate, object, graph)));

      // Detect duplicate variables in the pattern
      const duplicateElementLinks: { [element: string]: string[] } = this
        .getDuplicateElementLinks(subject, predicate, object, graph);

      // If there are duplicate variables in the search pattern,
      // make sure that we filter out the triples that don't have equal values for those triple elements,
      // as QPF ignores variable names.
      if (duplicateElementLinks) {
        filteredOutput = filteredOutput.filter((quad) => {
          // No need to check the graph, because an equal element already would have to be found in s, p, or o.
          for (const element1 of TRIPLE_TERM_NAMES) {
            for (const element2 of (duplicateElementLinks[element1] || [])) {
              if (!(<any> quad)[element1].equals((<any> quad)[element2])) {
                return false;
              }
            }
          }
          return true;
        });
      }

      return filteredOutput;
    });
    quads.on('newListener', (eventName) => {
      if (eventName === 'metadata') {
        setImmediate(() => quads._fillBuffer());
      }
    });

    return quads;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

}
