import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {TRIPLE_TERM_NAMES} from "rdf-terms";

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
    => string);

  constructor(mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest,
                IActorRdfDereferencePagedOutput>,
              uriConstructor: ((subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
                => string)) {
    this.mediatorRdfDereferencePaged = mediatorRdfDereferencePaged;
    this.uriConstructor = uriConstructor;
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

    // Detect duplicate variables in the pattern
    const duplicateElementLinks: {[element: string]: string[]} = this
      .getDuplicateElementLinks(subject, predicate, object, graph);

    const url: string = this.uriConstructor(subject, predicate, object, graph);
    const quads = new PromiseProxyIterator(() => this.mediatorRdfDereferencePaged.mediate({ url })
      .then((output) => {
        // Emit metadata in the stream, so we can attach it later to the actor's promise output
        quads.emit('metadata', output.firstPageMetadata);

        // If there are duplicate variables in the search pattern,
        // make sure that we filter out the triples that don't have equal values for those triple elements,
        // as QPF ignores variable names.
        if (duplicateElementLinks) {
          return output.data.filter((quad) => {
            // No need to check the graph, because an equal element already would have to be found in s, p, or o.
            for (const element1 of TRIPLE_TERM_NAMES) {
              for (const element2 of (duplicateElementLinks[element1] || [])) {
                if ((<any> quad)[element1] !== (<any> quad)[element2]) {
                  return false;
                }
              }
            }
            return true;
          });
        }
        return output.data;
      }));
    return quads;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

}
