import {Bindings, BindingsStream} from "@comunica/bus-query-operation";
import {ArrayIterator, AsyncIterator, MultiTransformIterator} from "asynciterator";
import {blankNode, quad} from "rdf-data-model";
import * as RDF from "rdf-js";

/**
 * Transforms a bindings stream into a quad stream given a quad template.
 *
 * This conforms to the SPARQL 1.1 spec on constructing triples:
 * https://www.w3.org/TR/sparql11-query/#rConstructTriples
 */
export class BindingsToQuadsIterator extends MultiTransformIterator<Bindings, RDF.Quad> {

  protected template: RDF.Quad[];
  protected blankNodeCounter: {[blankNodeLabel: string]: number};
  protected blankNodeBlacklist: string[];

  constructor(template: RDF.Quad[], bindingsStream: BindingsStream) {
    super(bindingsStream);
    this.template = template;
    this.blankNodeCounter = {};
    this.blankNodeBlacklist = [];
    for (const q of template) {
      if (q.subject.termType === 'BlankNode') {
        this.blankNodeBlacklist.push(q.subject.value);
      }
      if (q.predicate.termType === 'BlankNode') {
        this.blankNodeBlacklist.push(q.predicate.value);
      }
      if (q.object.termType === 'BlankNode') {
        this.blankNodeBlacklist.push(q.object.value);
      }
      if (q.graph.termType === 'BlankNode') {
        this.blankNodeBlacklist.push(q.graph.value);
      }
    }
  }

  /**
   * Bind the given term.
   * If the term is a variable and the variable is bound in the bindings object,
   * return the bindings value.
   * If the term is a variable and the variable is not bound in the bindings object,
   * a falsy value is returned..
   * Otherwise, the term itself is returned.
   * @param {Bindings}  bindings A bindings object.
   * @param {RDF.Term}  term     An RDF term.
   * @return {RDF.Term}          If the given term is not a variable, the term itself is returned.
   *                             If the given term is a variable, then the bound term is returned,
   *                             or a falsy value if it did not exist in the bindings.
   */
  public static bindTerm(bindings: Bindings, term: RDF.Term): RDF.Term {
    if (term.termType === 'Variable') {
      return bindings.get('?' + term.value);
    }
    return term;
  }

  /**
   * Bind the given quad pattern.
   * If one of the terms was a variable AND is not bound in the bindings,
   * a falsy value will be returned.
   * @param {Bindings} bindings A bindings object.
   * @param {RDF.Quad} pattern  An RDF quad.
   * @return {RDF.Quad}         A bound RDF quad or falsy.
   */
  public static bindQuad(bindings: Bindings, pattern: RDF.Quad): RDF.Quad {
    const s: RDF.Term = BindingsToQuadsIterator.bindTerm(bindings, pattern.subject);
    if (!s) {
      return null;
    }
    const p: RDF.Term = BindingsToQuadsIterator.bindTerm(bindings, pattern.predicate);
    if (!p) {
      return null;
    }
    const o: RDF.Term = BindingsToQuadsIterator.bindTerm(bindings, pattern.object);
    if (!o) {
      return null;
    }
    const g: RDF.Term = BindingsToQuadsIterator.bindTerm(bindings, pattern.graph);
    if (!g) {
      return null;
    }
    return quad(s, p, o, g);
  }

  /**
   * Convert a blank node to a unique blank node in the given context.
   * If the given term is not a blank node, the term itself will be returned.
   * @param                           blankNodeCounter   A counter object for blank nodes.
   * @param {string[]}                blankNodeBlacklist A blacklist of blank node labels.
   * @param                           blankNodeCache     An object with cached blank node localizations.
   * @param {RDF.Term}                term               The term that should be localized.
   * @return {RDF.Term}                                  A term.
   */
  public static localizeBlankNode(blankNodeCounter: {[blankNodeLabel: string]: number},
                                  blankNodeBlacklist: string[],
                                  blankNodeCache: {[blankNodeLabel: string]: RDF.BlankNode},
                                  term: RDF.Term): RDF.Term {
    if (term.termType === 'BlankNode') {
      let newTerm: RDF.BlankNode = blankNodeCache[term.value] || <RDF.BlankNode> term;
      while (blankNodeBlacklist.indexOf(newTerm.value) >= 0) {
        let counter: number = blankNodeCounter[term.value];
        if (!counter) {
          counter = blankNodeCounter[term.value] = 0;
        }
        blankNodeCounter[term.value]++;
        newTerm = blankNode(term.value + counter);
        blankNodeCache[term.value] = newTerm;
      }
      return newTerm;
    }
    return term;
  }

  /**
   * Convert the given quad to a quad that only contains unique blank nodes.
   * @param                           blankNodeCount     A counter object for blank nodes.
   * @param {string[]}                blankNodeBlacklist A blacklist of blank node labels.
   * @param                           blankNodeCache     An object with cached blank node localizations.
   * @param {RDF.Quad}                pattern            The pattern that should be localized.
   * @return {RDF.Quad}                                  A quad.
   */
  public static localizeQuad(blankNodeCount: {[blankNodeLabel: string]: number},
                             blankNodeBlacklist: string[],
                             blankNodeCache: {[blankNodeLabel: string]: RDF.BlankNode},
                             pattern: RDF.Quad): RDF.Quad {
    return quad(
      BindingsToQuadsIterator.localizeBlankNode(blankNodeCount, blankNodeBlacklist, blankNodeCache, pattern.subject),
      BindingsToQuadsIterator.localizeBlankNode(blankNodeCount, blankNodeBlacklist, blankNodeCache, pattern.predicate),
      BindingsToQuadsIterator.localizeBlankNode(blankNodeCount, blankNodeBlacklist, blankNodeCache, pattern.object),
      BindingsToQuadsIterator.localizeBlankNode(blankNodeCount, blankNodeBlacklist, blankNodeCache, pattern.graph),
    );
  }

  /**
   * Convert the given template to a list of quads based on the given bindings.
   * @param {Bindings}                bindings           A bindings object.
   * @param {RDF.Quad[]}              template           A list of quad patterns.
   * @param                           blankNodeCounter   A counter object for blank nodes.
   * @param {string[]}                blankNodeBlacklist A blacklist of blank node labels.
   * @param                           blankNodeCache     An object with cached blank node localizations.
   * @return {RDF.Quad[]}                                A list of quads.
   */
  public static bindTemplate(bindings: Bindings, template: RDF.Quad[],
                             blankNodeCounter: {[blankNodeLabel: string]: number},
                             blankNodeBlacklist: string[],
                             blankNodeCache: {[blankNodeLabel: string]: RDF.BlankNode}): RDF.Quad[] {
    return template
      // Bind variables to bound terms
      .map(BindingsToQuadsIterator.bindQuad.bind(null, bindings))
      // Remove quads that contained unbound terms, i.e., variables.
      .filter((q) => !!q)
      // Make sure the multiple instantiations of the template contain different blank nodes, as required by SPARQL 1.1.
      .map(BindingsToQuadsIterator.localizeQuad.bind(null, blankNodeCounter, blankNodeBlacklist, blankNodeCache));
  }

  public _createTransformer(bindings: Bindings): AsyncIterator<RDF.Quad> {
    const blankNodeCache: {[blankNodeLabel: string]: RDF.BlankNode} = {};
    return new ArrayIterator(BindingsToQuadsIterator.bindTemplate(
      bindings, this.template, this.blankNodeCounter, this.blankNodeBlacklist, blankNodeCache));
  }

}
