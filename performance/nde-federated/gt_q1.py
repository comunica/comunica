import json, urllib.request, urllib.parse, ssl, sys
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query, timeout=120):
    data = urllib.parse.urlencode({'query': query}).encode()
    req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
srcs = [l.strip() for l in open('sources/q1.txt') if l.strip() and not l.startswith('#')]
rkd = srcs[0]
links = []
for s in srcs[1:]:
    rows = q(s, 'PREFIX schema: <https://schema.org/> SELECT ?work ?title ?artist WHERE { ?work schema:creator ?agent . ?agent schema:sameAs ?artist . ?work schema:name ?title FILTER(STRSTARTS(STR(?artist), "https://data.rkd.nl/artists/")) }')
    print(s, len(rows), file=sys.stderr)
    for r in rows: r['src'] = s
    links += rows
artists = sorted({r['artist'] for r in links})
female = set()
for i in range(0, len(artists), 200):
    vals = ' '.join(f'<{a}>' for a in artists[i:i+200])
    for r in q(rkd, f'SELECT DISTINCT ?a WHERE {{ VALUES ?a {{ {vals} }} ?a <http://www.cidoc-crm.org/cidoc-crm/P2_has_type> <http://vocab.getty.edu/aat/300189557> ; <http://www.w3.org/2000/01/rdf-schema#label> ?l }}'):
        female.add(r['a'])
res = [r for r in links if r['artist'] in female]
print(json.dumps({'linkedWorks': len(links), 'linkedArtists': len(artists), 'femaleArtists': len(female), 'resultRowsApprox': len(res), 'bySource': {s: sum(1 for r in res if r['src']==s) for s in srcs[1:]}}, indent=1))
