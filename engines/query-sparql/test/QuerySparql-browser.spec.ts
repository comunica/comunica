import { expect, test } from '@playwright/test';

declare const Comunica: any;

const browserBundlePath = 'engines/query-sparql/comunica-browser.js';

test.describe('System test: QuerySparql', () => {
  test.beforeEach(async({ page }) => {
    await page.addScriptTag({ path: browserBundlePath });
  });

  test.describe('instantiated multiple times', () => {
    test('should contain different actors', async({ page }) => {
      const result = await page.evaluate(() => {
        const engine = new Comunica.QueryEngine();
        const engine2 = new Comunica.QueryEngine();
        const actorInitQuery1 = engine.actorInitQuery;
        const actorInitQuery2 = engine2.actorInitQuery;

        return {
          differentActors: actorInitQuery1 !== actorInitQuery2,
          sameActor1: actorInitQuery1 === engine.actorInitQuery,
          sameActor2: actorInitQuery2 === engine2.actorInitQuery,
        };
      });

      expect(result.sameActor1).toBe(true);
      expect(result.sameActor2).toBe(true);
      expect(result.differentActors).toBe(true);
    });
  });

  test.describe('query', () => {
    test.describe('simple SPO on a raw RDF document', () => {
      test.describe('string source query', () => {
        const query = 'CONSTRUCT WHERE { ?s ?p ?o }';
        const value = JSON.stringify({
          '@id': 'http://example.org/s',
          'http://example.org/p': { '@id': 'http://example.org/o' },
          'http://example.org/p2': { '@id': 'http://example.org/o2' },
        });
        const value2 = `
          <http://example.org/s> <http://example.org/p3> <http://example.org/o3> .
          <http://example.org/s> <http://example.org/p4> <http://example.org/o4> .
        `;
        const expectedResult = [
          {
            graph: { termType: 'DefaultGraph', value: '' },
            object: { termType: 'NamedNode', value: 'http://example.org/o' },
            predicate: { termType: 'NamedNode', value: 'http://example.org/p' },
            subject: { termType: 'NamedNode', value: 'http://example.org/s' },
          },
          {
            graph: { termType: 'DefaultGraph', value: '' },
            object: { termType: 'NamedNode', value: 'http://example.org/o2' },
            predicate: { termType: 'NamedNode', value: 'http://example.org/p2' },
            subject: { termType: 'NamedNode', value: 'http://example.org/s' },
          },
        ];

        test('should return the valid result with a turtle data source', async({ page }) => {
          const turtleValue = '<http://example.org/s> <http://example.org/p> <http://example.org/o>. <http://example.org/s> <http://example.org/p2> <http://example.org/o2>.';
          const context = { sources: [
            { type: 'serialized', value: turtleValue, mediaType: 'text/turtle', baseIRI: 'http://example.org/' },
          ]};

          const result = await page.evaluate(async({ query, context }) => {
            const engine = new Comunica.QueryEngine();
            const quads = await (await engine.queryQuads(query, context)).toArray();
            return quads.map((quad: any) => ({
              graph: { termType: quad.graph.termType, value: quad.graph.value },
              object: { termType: quad.object.termType, value: quad.object.value },
              predicate: { termType: quad.predicate.termType, value: quad.predicate.value },
              subject: { termType: quad.subject.termType, value: quad.subject.value },
            }));
          }, { query, context });

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });

        test('should return the valid result with multiple serialized', async({ page }) => {
          const context = { sources: [
            { type: 'serialized', value, mediaType: 'application/ld+json' },
            { type: 'serialized', value: value2, mediaType: 'text/turtle' },
          ]};
          const expectedResultMultiple = [
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/o' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/p' },
              subject: { termType: 'NamedNode', value: 'http://example.org/s' },
            },
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/o3' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/p3' },
              subject: { termType: 'NamedNode', value: 'http://example.org/s' },
            },
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/o2' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/p2' },
              subject: { termType: 'NamedNode', value: 'http://example.org/s' },
            },
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/o4' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/p4' },
              subject: { termType: 'NamedNode', value: 'http://example.org/s' },
            },
          ];

          const result = await page.evaluate(async({ query, context }) => {
            const engine = new Comunica.QueryEngine();
            const quads = await (await engine.queryQuads(query, context)).toArray();
            return quads.map((quad: any) => ({
              graph: { termType: quad.graph.termType, value: quad.graph.value },
              object: { termType: quad.object.termType, value: quad.object.value },
              predicate: { termType: quad.predicate.termType, value: quad.predicate.value },
              subject: { termType: quad.subject.termType, value: quad.subject.value },
            }));
          }, { query, context });

          expect(result).toHaveLength(expectedResultMultiple.length);
          expect(result).toMatchObject(expectedResultMultiple);
        });
      });

      test.describe('handle blank nodes with DESCRIBE queries', () => {
        const query = `DESCRIBE ?o  {
          ?s ?p ?o .
      }`;

        test('return consistent blank nodes with a data source containing a nested blank node', async({ page }) => {
          const context = { sources: [
            {
              type: 'serialized',
              value: `
                <http://example.org/a> <http://example.org/d> _:e .
                _:e <http://example.org/f> _:g .
                _:e <http://example.org/h> <http://example.org/i> .
                _:g <http://example.org/i> <http://example.org/j> .
              `,
              mediaType: 'text/turtle',
              baseIRI: 'http://example.org/',
            },
          ]};

          const result = await page.evaluate(async({ query, context }) => {
            const engine = new Comunica.QueryEngine();
            const quads = await (await engine.queryQuads(query, context)).toArray();
            return quads.map((quad: any) => ({
              graph: { termType: quad.graph.termType, value: quad.graph.value },
              object: { termType: quad.object.termType, value: quad.object.value },
              predicate: { termType: quad.predicate.termType, value: quad.predicate.value },
              subject: { termType: quad.subject.termType, value: quad.subject.value },
            }));
          }, { query, context });

          const blankNodeE = result.find((quad: any) => quad.predicate.value === 'http://example.org/f')?.subject.value;
          const blankNodeG = result.find((quad: any) => quad.predicate.value === 'http://example.org/f')?.object.value;
          const expectedResult = [
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'BlankNode', value: blankNodeG },
              predicate: { termType: 'NamedNode', value: 'http://example.org/f' },
              subject: { termType: 'BlankNode', value: blankNodeE },
            },
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/i' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/h' },
              subject: { termType: 'BlankNode', value: blankNodeE },
            },
            {
              graph: { termType: 'DefaultGraph', value: '' },
              object: { termType: 'NamedNode', value: 'http://example.org/j' },
              predicate: { termType: 'NamedNode', value: 'http://example.org/i' },
              subject: { termType: 'BlankNode', value: blankNodeG },
            },
          ];

          expect(result).toHaveLength(expectedResult.length);
          expect(result).toMatchObject(expectedResult);
        });
      });
    });

    test.describe('property paths', () => {
      test('should handle zero-or-more paths with lists', async({ page }) => {
        const context = { sources: [
          {
            type: 'serialized',
            value: `
              PREFIX fhir: <http://hl7.org/fhir/>

              <http://hl7.org/fhir/Observation/58671>
                fhir:id [ fhir:v "58671" ];
                fhir:value [
                  fhir:coding ( [
                    a <http://snomed.info/id/8517006>;
                  ] )
                ];
                fhir:component ( [
                  fhir:value [
                    fhir:coding []
                  ];
                ] ).
            `,
            mediaType: 'text/turtle',
            baseIRI: 'http://example.org/',
          },
        ]};

        const result = await page.evaluate(async(context) => {
          const engine = new Comunica.QueryEngine();
          const bindings = await (await engine.queryBindings(`
            PREFIX fhir: <http://hl7.org/fhir/>
            SELECT ?obsId {
              ?obs
                fhir:id [ fhir:v ?obsId ].
              ?obs fhir:value [
                  fhir:coding [ rdf:rest*/rdf:first [
                    a <http://snomed.info/id/8517006> ;
                  ] ]
                ].
            }
          `, context)).toArray();
          return bindings.map((binding: any) => Object.fromEntries(
            Array.from(binding, ([ key, value ]) => [ key.value, value.value ]),
          ));
        }, context);

        expect(result).toHaveLength(1);
      });

      test('should handle one-or-more paths in EXISTS', async({ page }) => {
        const context = { sources: [
          {
            type: 'serialized',
            value: `
              @prefix ex: <http://example.org/>.
              @prefix owl: <http://www.w3.org/2002/07/owl#>.
              @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
              @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.

              ex:class1 a owl:Class; rdfs:label "asdf".
              ex:qwer1 a owl:Class;
                  rdfs:label "qwer1".
              ex:qwer2 a owl:Class;
                  rdfs:label "qwer2".
              ex:class2 a owl:Class;
                  rdfs:label "class2".
              ex:qwer3 a owl:Class;
                  rdfs:label "qwer3";
                  a ex:qwer5.
              ex:qwer12 a owl:ObjectProperty;
                  rdfs:label "qwer12".
              ex:qwer13 a owl:Class.
            `,
            mediaType: 'text/turtle',
            baseIRI: 'http://example.org/',
          },
        ]};

        const result = await page.evaluate(async(context) => {
          const engine = new Comunica.QueryEngine();
          const bindings = await (await engine.queryBindings(`
            PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX owl: <http://www.w3.org/2002/07/owl#>
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX ex: <http://example.org/>

            SELECT
                ?class
                ?label
                ( EXISTS { ?class rdfs:subClassOf+ ex:class1 } AS ?class1 )
                ( EXISTS { ?class rdfs:subClassOf+ ex:class2 } AS ?class2 )
            WHERE {
                ?class rdf:type owl:Class ;
                       rdfs:label ?label .
                FILTER ( STRSTARTS( STR(?class), STR(ex:) ) )
                FILTER ( ?class NOT IN ( ex:class1, ex:class2 ) )
            }
          `, context)).toArray();
          return bindings.length;
        }, context);

        expect(result).toBe(3);
      });
    });

    test.describe('initialBindings', () => {
      let sourcesValue1: string;

      test.beforeEach(() => {
        sourcesValue1 = `
          @prefix ex: <http://example.org/test#> .

          ex:testBinding
            ex:property "testProperty" .
        `;
      });

      test('should consider the initialBindings in the bound function', async({ page }) => {
        const expectedResult = [
          { a: 'http://example.org/test#testBinding' },
        ];

        const result = await page.evaluate(async(sourceValue) => {
          const engine = new Comunica.QueryEngine();
          const initialBindings = (await (await engine.queryBindings(`
            SELECT ?a WHERE {
              VALUES ?a { <http://example.org/test#testBinding> }
            }
          `)).toArray())[0];
          const bindings = await (await engine.queryBindings(`
            PREFIX ex: <http://example.org/test#>

            SELECT $a WHERE {
              {
                FILTER (bound($a))
              }
              $a ex:property "testProperty" .
              FILTER (bound($a)) .
            }
          `, {
            sources: [
              {
                type: 'serialized',
                value: sourceValue,
                mediaType: 'text/turtle',
              },
            ],
            initialBindings,
          })).toArray();

          return bindings.map((binding: any) => Object.fromEntries(
            Array.from(binding, ([ key, value ]) => [ key.value, value.value ]),
          ));
        }, sourcesValue1);

        expect(result).toHaveLength(expectedResult.length);
        expect(result).toMatchObject(expectedResult);
      });

      test('should not overwrite initialBindings', async({ page }) => {
        const errorMessage = await page.evaluate(async() => {
          const engine = new Comunica.QueryEngine();
          const initialBindings = (await (await engine.queryBindings(`
            SELECT ?a WHERE {
              VALUES ?a { <http://example.org/test#testBinding> }
            }
          `)).toArray())[0];

          try {
            await engine.queryBindings(`
              SELECT $a WHERE {
                BIND (true AS $a) .
              }
            `, {
              sources: [
                {
                  type: 'serialized',
                  value: '',
                  mediaType: 'text/turtle',
                },
              ],
              initialBindings,
            });
          } catch (error) {
            return (<Error> error).message;
          }

          return '';
        });

        expect(errorMessage).toContain('Tried to bind variable ?a in a BIND operator.');
      });
    });
  });

  test.describe('update', () => {
    test.describe('with browser HTTP destination', () => {
      let documentQuads: string[];
      let patchBodies: string[];
      let requestMethods: string[];
      const resourceUrl = 'https://example.org/resource';

      test.beforeEach(async({ page }) => {
        documentQuads = [];
        patchBodies = [];
        requestMethods = [];

        await page.route(resourceUrl, async(route) => {
          const request = route.request();
          requestMethods.push(request.method());
          const corsHeaders = {
            'access-control-allow-headers': 'content-type',
            'access-control-allow-methods': 'GET, HEAD, PATCH, OPTIONS',
            'access-control-allow-origin': '*',
            'access-control-expose-headers': 'accept-patch, content-type',
          };

          if (request.method() === 'OPTIONS') {
            await route.fulfill({
              status: 204,
              headers: corsHeaders,
              body: '',
            });
            return;
          }

          if (request.method() === 'GET' || request.method() === 'HEAD') {
            await route.fulfill({
              status: 200,
              headers: {
                ...corsHeaders,
                'accept-patch': 'application/sparql-update',
                'content-type': 'text/turtle',
              },
              body: request.method() === 'HEAD' ? '' : documentQuads.join('\n'),
            });
            return;
          }

          if (request.method() === 'PATCH') {
            const body = request.postData() ?? '';
            patchBodies.push(body);

            if (body.includes('DELETE DATA') && body.includes('<ex:s-pre> <ex:p-pre> <ex:o-pre> .')) {
              documentQuads = documentQuads.filter(quad => quad !== '<ex:s-pre> <ex:p-pre> <ex:o-pre> .');
            }
            if (body.includes('INSERT DATA') && body.includes('<ex:s> <ex:p> <ex:o> .') &&
              !documentQuads.includes('<ex:s> <ex:p> <ex:o> .')) {
              documentQuads.push('<ex:s> <ex:p> <ex:o> .');
            }

            await route.fulfill({
              status: 200,
              headers: corsHeaders,
              body: '',
            });
            return;
          }

          await route.fulfill({ status: 405, headers: corsHeaders, body: '' });
        });
      });

      test('with direct insert and delete', async({ page }) => {
        documentQuads = [ '<ex:s-pre> <ex:p-pre> <ex:o-pre> .' ];

        const result = await page.evaluate(async(resourceUrl) => {
          const engine = new Comunica.QueryEngine();

          await engine.queryVoid(`INSERT DATA {
            <ex:s> <ex:p> <ex:o>.
          };
          DELETE DATA {
            <ex:s-pre> <ex:p-pre> <ex:o-pre>.
          }`, {
            sources: [ resourceUrl ],
            destination: resourceUrl,
          });
          await engine.invalidateHttpCache(resourceUrl);

          const quads = await (await engine.queryQuads('CONSTRUCT WHERE { ?s ?p ?o }', {
            sources: [ resourceUrl ],
          })).toArray();

          return quads.map((quad: any) => ({
            graph: { termType: quad.graph.termType, value: quad.graph.value },
            object: { termType: quad.object.termType, value: quad.object.value },
            predicate: { termType: quad.predicate.termType, value: quad.predicate.value },
            subject: { termType: quad.subject.termType, value: quad.subject.value },
          }));
        }, resourceUrl);

        expect(requestMethods).toContain('PATCH');
        expect(patchBodies.join('\n')).toContain('INSERT DATA');
        expect(patchBodies.join('\n')).toContain('DELETE DATA');
        expect(patchBodies.join('\n')).toContain('<ex:s> <ex:p> <ex:o> .');
        expect(patchBodies.join('\n')).toContain('<ex:s-pre> <ex:p-pre> <ex:o-pre> .');
        expect(result).toHaveLength(1);
        expect(result).toMatchObject([
          {
            graph: { termType: 'DefaultGraph', value: '' },
            object: { termType: 'NamedNode', value: 'ex:o' },
            predicate: { termType: 'NamedNode', value: 'ex:p' },
            subject: { termType: 'NamedNode', value: 'ex:s' },
          },
        ]);
      });
    });
  });

  test.describe('explain', () => {
    test.describe('a simple SPO on a raw RDF document', () => {
      const query = `SELECT * WHERE {
      ?s ?p ?o.
    }`;
      const context = {
        sources: [ 'https://www.rubensworks.net/' ],
      };

      test('explaining physical-json plan', async({ page }) => {
        const result = await page.evaluate(async({ query, context }) => {
          const engine = new Comunica.QueryEngine();
          return JSON.parse(JSON.stringify(await engine.explain(query, context, 'physical-json')));
        }, { query, context });

        expect(result).toEqual({
          explain: true,
          type: 'physical-json',
          data: {
            logical: 'project',
            variables: [ 'o', 'p', 's' ],
            children: [
              {
                logical: 'pattern',
                pattern: '?s ?p ?o',
                source: 'QuerySourceHypermedia(https://www.rubensworks.net/)(SkolemID:0)',
              },
            ],
          },
        });
      });
    });
  });
});
