import * as fs from 'fs';
import * as path from 'path';
import type { IActionAbstractMediaTyped } from '@comunica/actor-abstract-mediatyped';
import type { IActionRuleParse } from '@comunica/bus-rule-parse';
import { ActionContext, Bus } from '@comunica/core';
import type { Rule } from '@comunica/reasoning-types';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import streamifyString = require('streamify-string');
import { ActorRuleParseHylar } from '../lib';
import 'jest-rdf'; // eslint-disable-line import/no-unassigned-import

const { variable, quad, namedNode } = DataFactory;

function createAction(file: string, isFile = true): IActionRuleParse {
  return {
    data: isFile ? fs.createReadStream(path.join(__dirname, 'data', `${file}.hylar`)) : streamifyString(file),
    metadata: { baseIRI: 'http://example.org' },
    context: new ActionContext(),
  };
}

function createMediaTypedAction(file: string, isFile = true): IActionAbstractMediaTyped<IActionRuleParse> {
  return {
    handle: createAction(file, isFile),
    context: new ActionContext(),
  };
}

describe('ActorRuleParseHyLAR', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRuleParseHyLAR instance', () => {
    let actor: ActorRuleParseHylar;

    beforeEach(() => {
      actor = new ActorRuleParseHylar(<any> { name: 'actor', bus });
    });

    it('should test', async() => {
      expect(await actor.test(createMediaTypedAction('rdfs'))).toEqual({ handle: true });
    });

    it('Should parse all owl2rl rules', async() => {
      const { data } = await actor.runHandle(createAction('owl2rl'), 'hylar', new ActionContext({}));
      expect(await arrayifyStream(data)).toHaveLength(52);
    });

    it('should run', async() => {
      const { data } = await actor.runHandle({
        data: streamifyString('(?uuu ?aaa ?yyy) -> (?aaa rdf:type rdf:Property)'),
        context: new ActionContext(),
      }, 'hylar', new ActionContext());

      const rules: Rule[] = await arrayifyStream(data);
      expect(rules).toHaveLength(1);
      expect(rules[0].ruleType).toEqual('rdfs');
      expect((<any> rules[0]).premise).toBeRdfIsomorphic([
        quad(variable('uuu'), variable('aaa'), variable('yyy'), variable('?g')),
      ]);
      expect((<any> rules[0]).conclusion).toBeRdfIsomorphic([
        quad(
          variable('aaa'),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#Property'),
          variable('?g'),
        ),
      ]);
    });
  });
});
