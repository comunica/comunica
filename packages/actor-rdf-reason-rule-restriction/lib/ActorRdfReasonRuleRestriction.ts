import type { IActionRdfReason, IActionRdfReasonExecute, IActorRdfReasonMediatedArgs } from '@comunica/bus-rdf-reason';
import { ActorRdfReasonMediated } from '@comunica/bus-rdf-reason';
import type { IActorTest } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import type { INestedPremiseConclusionRule, INestedPremiseConclusionRuleBase } from '@comunica/reasoning-types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { single, UnionIterator } from 'asynciterator';
import { promisifyEventEmitter } from 'event-emitter-promisify/dist';
import { Store } from 'n3';
import { forEachTerms, mapTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor that
 */
export class ActorRdfReasonRuleRestriction extends ActorRdfReasonMediated {
  public constructor(args: IActorRdfReasonRuleRestrictionArgs) {
    super(args);
  }

  public async test(action: IActionRdfReason): Promise<IActorTest> {
    if (!action.context.has(KeysRdfReason.data) || !action.context.has(KeysRdfReason.rules)) {
      throw new Error('Missing dataset or rule context');
    }
    return true;
  }

  public async execute(action: IActionRdfReasonExecute): Promise<void> {
    const { context, rules } = action;
    const store = new Store();
    let size = 0;
    do {
      size = store.size;
      // TODO: Handle rule assertions better
      const quadStreamInsert = evaluateRuleSet(<any> rules, this.unionQuadSource(context).match);
      const { execute } = await this.runImplicitUpdate({ quadStreamInsert: quadStreamInsert.clone(), context });
      await Promise.all([ execute(), await promisifyEventEmitter(store.import(quadStreamInsert.clone())) ]);
    } while (store.size > size);
  }
}

interface IActorRdfReasonRuleRestrictionArgs extends IActorRdfReasonMediatedArgs {
}

type Match = (pattern: Algebra.Pattern | RDF.Quad) => AsyncIterator<RDF.Quad>;

type Mapping = Record<string, RDF.Term>;

export function evaluateRuleSet(
  rules: AsyncIterator<INestedPremiseConclusionRule> | INestedPremiseConclusionRule[], match: Match,
): AsyncIterator<RDF.Quad> {
  // Autostart needs to be false to prevent the iterator from ending before being consumed by rdf-update-quads
  // https://github.com/comunica/comunica-feature-reasoning/issues/904
  // https://github.com/RubenVerborgh/AsyncIterator/issues/25
  return new UnionIterator(
    rules.map((rule: INestedPremiseConclusionRule) => evaluateNestedThroughRestriction(rule, match)),
    { autoStart: false },
  );
}

// We can probably use InitialBindings here to do a lot of optimizations
export function evaluateNestedThroughRestriction(nestedRule: INestedPremiseConclusionRule, match: Match):
AsyncIterator<RDF.Quad> {
  const iterators = single(nestedRule).transform<{ mappings: AsyncIterator<Mapping>; conclusion: RDF.Quad[] }>({
    autoStart: false,
    transform(rule: INestedPremiseConclusionRuleBase | undefined, done, push) {
      let mappings: AsyncIterator<Mapping> = single({});
      while (rule) {
        mappings = rule.premise.reduce(
          (iterator, premise) => new UnionIterator(iterator.map(
            mapping => {
              const cause = substituteQuad(premise, mapping);
              return match(cause).map(quad => {
                let localMapping: Mapping | undefined = {};

                forEachTerms(cause, (term, key) => {
                  if (term.termType === 'Variable' && localMapping) {
                    if (term.value in localMapping && !localMapping[term.value].equals(quad[key])) {
                      localMapping = undefined;
                    } else {
                      localMapping[term.value] = quad[key];
                    }
                  }
                });

                return localMapping && Object.assign(localMapping, mapping);
              }).filter<Mapping>((_mapping): _mapping is Mapping => _mapping !== undefined);
            },
          ), { autoStart: false }),
          mappings,
        );
        push({
          conclusion: rule.conclusion,
          // The only time the mappings shouldn't be cloned is if the rules is
          // not nested at all
          mappings: nestedRule.next ? mappings.clone() : mappings,
        });
        // eslint-disable-next-line no-cond-assign
        if (rule = rule.next) {
          mappings = mappings.clone();
        }
      }
      done();
    },
  }).map(({ mappings, conclusion }) => new UnionIterator(
    conclusion.map(quad => mappings.map(mapping => substituteQuad(quad, mapping))), { autoStart: false },
  ));
  return new UnionIterator(iterators, { autoStart: false });
}

export function substituteQuad(term: RDF.Quad, mapping: Mapping): RDF.Quad {
  return mapTerms(term, elem => elem.termType === 'Variable' && elem.value in mapping ? mapping[elem.value] : elem);
}
