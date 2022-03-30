import type { Readable } from 'stream';
import type {
  IActionRuleParse, IActorRuleParseOutput, IActorRuleParseFixedMediaTypesArgs,
} from '@comunica/bus-rule-parse';
import { ActorRuleParseFixedMediaTypes } from '@comunica/bus-rule-parse';
import type { IActorTest } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { wrap } from 'asynciterator';
import { termAsQuad } from 'is-quad';
import { DataFactory } from 'n3';
import { stringToTerm } from 'rdf-string';

const { quad, variable } = DataFactory;

/**
 * A comunica Hylar Rule Parse Actor.
 */
export class ActorRuleParseHylar extends ActorRuleParseFixedMediaTypes {
  /**
   * TODO: Check this
   * @param args -
   *   \ @defaultNested {{
   *       "application/hylar": 1.0,
   *       "text/hylar": 0.9
   *     }} mediaTypePriorities
   *   \ @defaultNested {{
   *       "text/hylar": "http://www.w3.org/ns/formats/Hylar",
   *       "application/hylar": "http://www.w3.org/ns/formats/Hylar"
   *     }} mediaTypeFormats
   */
  public constructor(args: IActorRuleParseFixedMediaTypesArgs) {
    super(args);
  }

  public async runHandle(action: IActionRuleParse, mediaType: string, context: IActionContext):
  Promise<IActorRuleParseOutput> {
    this.logDebug(action.context, 'running hylar handle')
    let buffer = '';

    // TODO: Make this a module of its own right
    const ruleStrings = wrap<Buffer>(action.data).map(chunk => chunk.toString()).transform<string>({
      transform(data, done, push) {
        for (const char of data) {
          if (char === '\n') {
            if (buffer !== '') {
              push(buffer);
              buffer = '';
            }
          } else {
            buffer += char;
          }
        }
        // TODO: Fix this - it assumes 'clean' chunks
        // it is here to handle the case where there is
        // no line break at EOF
        if (buffer !== '') {
          push(buffer);
          buffer = '';
        }
        done();
      },
    });

    return { data: <RDF.ResultStream<Rule> & Readable> <unknown> ruleStrings.map(ruleString => parseRule(ruleString)) };
  }
}

const TRIPLE = /((?<=\()\S+?\s\S+?\s\S+?(?=\)))|false/gui;

export function parseRule(strRule: string): Rule {
  const [ premise, conclusion ] = strRule.split('->');
  const premiseQuads = premise.match(TRIPLE);
  const conclusionQuads = conclusion.match(TRIPLE);

  /* istanbul ignore next - remove with closure of https://github.com/comunica/comunica-feature-reasoning/issues/31 */
  if (premiseQuads === null || conclusionQuads === null) {
    throw new Error(`Invalid rule: ${strRule}`);
  }

  return {
    ruleType: 'rdfs',
    premise: parseTriples(premiseQuads),
    conclusion: conclusionQuads[0] === 'false' ? false : parseTriples(conclusionQuads),
  };
}

export function parseTriples(triples: string[]): RDF.Quad[] {
  return triples.map(triple => parseTriple(triple));
}

export function parseTriple(triple: string): RDF.Quad {
  const [ subject, predicate, object ] = triple.split(' ');
  return termAsQuad(
    quad<RDF.BaseQuad>(myStringToTerm(subject), myStringToTerm(predicate), myStringToTerm(object), variable('?g')),
  );
}

const prefixes: Record<string, string> = {
  owl: 'http://www.w3.org/2002/07/owl#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  hax: 'http://ucbl.github.io/HyLAR-Reasoner/axioms/',
};

function myStringToTerm(value: string): RDF.Term {
  const split = value.split(':');
  if (split.length >= 2) {
    const prefix = split[0];
    if (prefix in prefixes) {
      value = prefixes[prefix] + value.slice(prefix.length + 1);
    }
  }
  return stringToTerm(value);
}
