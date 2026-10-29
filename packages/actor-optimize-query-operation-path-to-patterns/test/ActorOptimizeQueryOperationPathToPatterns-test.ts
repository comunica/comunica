import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { ActorOptimizeQueryOperationPathToPatterns } from '../lib/ActorOptimizeQueryOperationPathToPatterns';
import '@comunica/utils-jest';

const DF = new DataFactory();

describe('ActorOptimizeQueryOperationPathToPatterns', () => {
  let bus: any;
  let AF: AlgebraFactory;
  let actor: ActorOptimizeQueryOperationPathToPatterns;
  let context: IActionContext;

  const s = DF.variable('s');
  const o = DF.variable('o');
  const p = DF.namedNode('ex:p');
  const q = DF.namedNode('ex:q');
  const v0 = DF.variable('__comunica:path0');
  const v1 = DF.variable('__comunica:path1');
  const g = DF.defaultGraph();

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    AF = new AlgebraFactory(DF);
    actor = new ActorOptimizeQueryOperationPathToPatterns({ name: 'actor', bus });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  async function rewrite(operation: Algebra.Operation): Promise<Algebra.Operation> {
    return (await actor.run({ operation, context })).operation;
  }

  it('should test', async() => {
    await expect(actor.test({ operation: <any> undefined, context })).resolves.toPassTestVoid();
  });

  it('should rewrite links into patterns', async() => {
    const link = Object.assign(AF.createLink(p), { metadata: { a: 'b' }});
    await expect(rewrite(AF.createPath(s, link, o))).resolves
      .toEqual(Object.assign(AF.createPattern(s, p, o, g), { metadata: { a: 'b' }}));
  });

  it('should rewrite inverse paths by swapping subject and object', async() => {
    await expect(rewrite(AF.createPath(s, AF.createInv(AF.createLink(p)), o))).resolves
      .toEqual(Object.assign(AF.createPattern(o, p, s, g), { metadata: undefined }));
  });

  it('should rewrite sequences into joins over projected fresh variables', async() => {
    await expect(rewrite(AF.createPath(s, AF.createSeq([ AF.createLink(p), AF.createLink(q) ]), o))).resolves
      .toEqual(AF.createProject(AF.createJoin([
        Object.assign(AF.createPattern(s, p, v0, g), { metadata: undefined }),
        Object.assign(AF.createPattern(v0, q, o, g), { metadata: undefined }),
      ]), [ s, o ]));
  });

  it('should only project variables once, including a graph variable', async() => {
    const graph = DF.variable('g');
    const operation = AF.createPath(s, AF.createSeq([ AF.createLink(p), AF.createLink(q) ]), s, graph);
    const result = <Algebra.Project> await rewrite(operation);
    expect(result.variables).toEqual([ s, graph ]);
    expect((<Algebra.Pattern> (<Algebra.Join> result.input).input[1]).graph).toEqual(graph);
  });

  it('should rewrite alternatives into unions', async() => {
    await expect(rewrite(AF.createPath(s, AF.createAlt([ AF.createLink(p), AF.createInv(AF.createLink(q)) ]), o)))
      .resolves.toEqual(AF.createUnion([
        Object.assign(AF.createPattern(s, p, o, g), { metadata: undefined }),
        Object.assign(AF.createPattern(o, q, s, g), { metadata: undefined }),
      ]));
  });

  it('should rewrite nested paths, with distinct fresh variables', async() => {
    const seq = AF.createSeq([ AF.createLink(p), AF.createLink(q) ]);
    await expect(rewrite(AF.createPath(s, AF.createAlt([ seq, AF.createInv(seq) ]), o))).resolves
      .toEqual(AF.createUnion([
        AF.createProject(AF.createJoin([
          Object.assign(AF.createPattern(s, p, v0, g), { metadata: undefined }),
          Object.assign(AF.createPattern(v0, q, o, g), { metadata: undefined }),
        ]), [ s, o ]),
        AF.createProject(AF.createJoin([
          Object.assign(AF.createPattern(o, p, v1, g), { metadata: undefined }),
          Object.assign(AF.createPattern(v1, q, s, g), { metadata: undefined }),
        ]), [ o, s ]),
      ]));
  });

  it('should keep paths that need path evaluation', async() => {
    const zeroOrMore = AF.createPath(s, AF.createZeroOrMorePath(AF.createLink(p)), o);
    await expect(rewrite(zeroOrMore)).resolves.toEqual(zeroOrMore);
    const seq = AF.createSeq([ AF.createZeroOrMorePath(AF.createLink(p)), AF.createLink(q) ]);
    await expect(rewrite(AF.createPath(s, seq, o)))
      .resolves.toEqual(AF.createProject(AF.createJoin([
        AF.createPath(s, AF.createZeroOrMorePath(AF.createLink(p)), v0, g),
        Object.assign(AF.createPattern(v0, q, o, g), { metadata: undefined }),
      ]), [ s, o ]));
  });

  it('should rewrite paths within other operations', async() => {
    const operation = AF.createProject(AF.createJoin([
      AF.createPattern(s, p, o),
      AF.createPath(o, AF.createLink(q), s),
    ]), [ s ]);
    await expect(rewrite(operation)).resolves.toEqual(AF.createProject(AF.createJoin([
      AF.createPattern(s, p, o),
      Object.assign(AF.createPattern(o, q, s, g), { metadata: undefined }),
    ]), [ s ]));
  });
});
