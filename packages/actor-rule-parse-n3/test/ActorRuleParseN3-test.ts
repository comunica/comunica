import * as fs from 'fs';
import * as path from 'path';
import type { IActionAbstractMediaTyped } from '@comunica/actor-abstract-mediatyped';
import type { IActionRuleParse, IActorRuleParseOutput } from '@comunica/bus-rule-parse';
import { ActionContext, Bus } from '@comunica/core';
import { mediatorRdfParse } from '@comunica/reasoning-mocks';
import type { IPremiseConclusionRule } from '@comunica/reasoning-types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import streamifyString = require('streamify-string');
import { ActorRuleParseN3 } from '../lib';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import

const { namedNode, quad, variable } = DataFactory;

const rule1 = `
@prefix : <dpe#>.

{:b :re ?X} => {:c :not_re ?X}.
`;

const rule1Equivalent = `
@prefix : <dpe#>.

{:c :not_re ?X} <= {:b :re ?X}.
`;

const rule2 = `
@prefix list: <http://www.w3.org/2000/10/swap/list#>.
@prefix e: <http://eulersharp.sourceforge.net/2003/03swap/log-rules#>.
@prefix : <http://josd.github.io/brain/4color#>.

{() :places true} <= true.

{?PLACES :places true} <= {
    ?PLACES e:firstRest ((?PLACE ?COLOR) ?TAIL).
    ?TAIL :places true.
    ?PLACE :neighbours ?NEIGHBOURS.
    (:red :green :blue :yellow) list:member ?COLOR.
    ?SCOPE e:fail {
        ?TAIL list:member (?NEIGHBOUR ?COLOR).
        ?NEIGHBOURS list:member ?NEIGHBOUR.
    }.
}.
`;

function createAction(file: string, isFile = true): IActionRuleParse {
  return {
    data: isFile ? fs.createReadStream(path.join(__dirname, 'data', `${file}.hylar`)) : streamifyString(file),
    metadata: { baseIRI: 'http://example.org#' },
    context: new ActionContext(),
  };
}

function createMediaTypedAction(file: string, isFile = true): IActionAbstractMediaTyped<IActionRuleParse> {
  return {
    handle: createAction(file, isFile),
    context: new ActionContext(),
  };
}

describe('ActorRuleParseN3', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRuleParseN3 instance', () => {
    let actor: ActorRuleParseN3;

    beforeEach(() => {
      actor = new ActorRuleParseN3({
        name: 'actor',
        bus,
        mediatorRdfParse,
        mediaTypeFormats: {},
        mediaTypePriorities: {},
      });
    });

    // TODO: IMPLEMENT THIS
    it('should test', async() => {
      await expect(actor.test(createMediaTypedAction(rule1, false))).resolves.toEqual({ handle: []});
      await expect(actor.test(createMediaTypedAction(rule2, false))).resolves.toEqual({ handle: []});
    });

    it('should run', async() => {
      const { data } = <IActorRuleParseOutput> (<any> await actor.run(createMediaTypedAction(rule1, false))).handle;

      const arr = await arrayifyStream(data);

      expect(arr).toHaveLength(1);

      const rule: IPremiseConclusionRule = arr[0];

      expect(rule.premise).toEqualRdfQuadArray([
        quad(
          namedNode('http://dpe#b'),
          namedNode('http://dpe#re'),
          variable('X'),
          variable('g'),
        ),
      ]);

      expect(rule.conclusion).toEqualRdfQuadArray([
        quad(
          namedNode('http://dpe#c'),
          namedNode('http://dpe#not_re'),
          variable('X'),
          variable('g'),
        ),
      ]);
    });
  });
});
