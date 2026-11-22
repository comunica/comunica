import json, urllib.request, urllib.parse, ssl, time, sys
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query):
    data = urllib.parse.urlencode({'query': query}).encode()
    req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
    with urllib.request.urlopen(req, timeout=180, context=ctx) as r:
        return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
CHT = 'https://data.cultureelerfgoed.nl/term/id/cht/c0a4866d-5222-4f10-a6bc-592ba4e42c8e'
aats = [r['a'] for r in q('https://api.linkeddata.cultureelerfgoed.nl/datasets/thesauri/cht/sparql', 'SELECT ?a WHERE { ?c <http://www.w3.org/2004/02/skos/core#prefLabel> "portretten"@nl ; <http://www.w3.org/2004/02/skos/core#exactMatch> ?a }')]
vals = ' '.join(f'<{a}>' for a in aats + [CHT])
rows = set()
for s in [l.strip() for l in open('sources/q4.txt') if l.strip() and not l.startswith('#')][1:]:
    try:
        for r in q(s, 'PREFIX schema: <https://schema.org/> SELECT DISTINCT ?object ?title ?date WHERE { VALUES ?x { ' + vals + ' } ?term schema:sameAs ?x . ?object schema:artform ?term ; schema:name ?title OPTIONAL { ?object schema:dateCreated ?date } }'):
            rows.add((r['object'], r['title'], r.get('date')))
    except Exception as e:
        print('err', s, e, file=sys.stderr)
    time.sleep(0.2)
json.dump(sorted(rows, key=str), open('groundtruth/q4.json', 'w'))
print('q4 GT distinct (object,title,date)', len(rows), 'with date', sum(1 for r in rows if r[2]))
