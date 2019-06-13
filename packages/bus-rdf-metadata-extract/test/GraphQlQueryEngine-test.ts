import {GraphQlQueryEngine} from "../lib/GraphQlQueryEngine";
const streamifyString = require("streamify-string");
const quad = require('rdf-quad');

describe('GraphQlQueryEngine', () => {
  const engine: any = {
    query: jest.fn(() => ({
      data: Promise.resolve([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]),
    })),
    resultToString: jest.fn(async (p) => ({ data: streamifyString(JSON.stringify(await p.data)) })),
  };

  describe('The GraphQlQueryEngine module', () => {
    it('should be a function', () => {
      expect(GraphQlQueryEngine).toBeInstanceOf(Function);
    });

    it('should be a GraphQlQueryEngine constructor', () => {
      expect(new (<any> GraphQlQueryEngine)(engine))
        .toBeInstanceOf(GraphQlQueryEngine);
    });

    it('should store the engine', () => {
      expect(new (<any> GraphQlQueryEngine)(engine).comunicaEngine).toBe(engine);
    });
  });

  describe('An GraphQlQueryEngine instance', () => {

    describe('query', () => {
      const graphQlEngine = new GraphQlQueryEngine(engine);

      it('should return a JSON object', async () => {
        const query: any = 'abc';
        const options = {};
        expect(await graphQlEngine.query(query, options)).toEqual([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]);
        expect(engine.query).toHaveBeenCalledWith(query, options);
        expect(engine.resultToString).toHaveBeenCalledWith({
          data: Promise.resolve([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
          ]),
        }, 'application/sparql-results+json');
      });
    });
  });
});
