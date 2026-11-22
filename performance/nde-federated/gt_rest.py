import json, urllib.request, urllib.parse, ssl, time, sys
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query):
    data = urllib.parse.urlencode({'query': query}).encode()
    for i in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
            with urllib.request.urlopen(req, timeout=180, context=ctx) as r:
                return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(3); continue
            raise
src = lambda f: [l.strip() for l in open(f) if l.strip() and not l.startswith('#')]
out = {}
# Q3
rows = set()
for s in src('sources/wo2.txt'):
    try:
        for r in q(s, 'PREFIX schema: <https://schema.org/> SELECT DISTINCT ?object ?title WHERE { { ?object schema:about <https://data.niod.nl/WO2_Thesaurus/kampen/4884> } UNION { ?object schema:about ?t . ?t schema:sameAs <https://data.niod.nl/WO2_Thesaurus/kampen/4884> } ?object schema:name ?title }'):
            rows.add((r['object'], r['title']))
    except Exception as e: print('q3 err', s, e, file=sys.stderr)
out['q3'] = len(rows)
# Q4b
CHT = 'https://data.cultureelerfgoed.nl/term/id/cht/c0a4866d-5222-4f10-a6bc-592ba4e42c8e'
aats = [r['a'] for r in q('https://api.linkeddata.cultureelerfgoed.nl/datasets/thesauri/cht/sparql', 'SELECT ?c ?a WHERE { ?c <http://www.w3.org/2004/02/skos/core#prefLabel> "portretten"@nl ; <http://www.w3.org/2004/02/skos/core#exactMatch> ?a }')]
print('aat', aats, file=sys.stderr)
vals = ' '.join(f'<{a}>' for a in aats + [CHT])
rows = set(); per = {}
for s in src('sources/q4.txt')[1:]:
    try:
        rs = q(s, 'PREFIX schema: <https://schema.org/> SELECT DISTINCT ?object ?title WHERE { VALUES ?x { ' + vals + ' } ?term schema:sameAs ?x . ?object schema:artform ?term ; schema:name ?title }')
        per[s] = len(rs); rows |= {(r['object'], r['title']) for r in rs}
    except Exception as e: print('q4 err', s, e, file=sys.stderr)
    time.sleep(0.3)
out['q4b'] = len(rows); out['q4b_sources_with_results'] = sum(1 for v in per.values() if v)
# Q5b B&G branch
rs = q('https://cat.apis.beeldengeluid.nl/sparql', 'SELECT (COUNT(DISTINCT ?item) AS ?n) (COUNT(*) AS ?rows) WHERE { ?role <https://schema.org/creator> <http://data.beeldengeluid.nl/gtaa/77493> . ?item <https://schema.org/creator> ?role ; <https://schema.org/name> ?title }')
out['q5b_bg'] = rs
rs = q('https://cat.apis.beeldengeluid.nl/sparql', 'SELECT (SUM(IF(isBlank(?role),1,0)) AS ?blank) (COUNT(*) AS ?all) WHERE { ?role <https://schema.org/creator> <http://data.beeldengeluid.nl/gtaa/77493> }')
out['q5b_bg_roles'] = rs
print(json.dumps(out, indent=1))
