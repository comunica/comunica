import json, urllib.request, urllib.parse, ssl, time
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query):
    data = urllib.parse.urlencode({'query': query}).encode()
    for i in range(5):
        try:
            req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
            with urllib.request.urlopen(req, timeout=180, context=ctx) as r:
                return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(3); continue
            raise
b = q('https://sparql.goudatijdmachine.nl/', 'PREFIX schema: <https://schema.org/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?building ?name ?monument WHERE { ?building a <https://www.goudatijdmachine.nl/def#Gebouw> ; schema:name ?name ; rdfs:seeAlso ?monument FILTER(STRSTARTS(STR(?monument), "https://linkeddata.cultureelerfgoed.nl/cho-kennis/id/rijksmonument/")) }')
mons = sorted({r['monument'] for r in b})
print('gouda building rows', len(b), 'monuments', len(mons))
det = []
for i in range(0, len(mons), 100):
    vals = ' '.join(f'<{m}>' for m in mons[i:i+100])
    det += q('https://api.linkeddata.cultureelerfgoed.nl/datasets/rce/cho/sparql', 'PREFIX ceo: <https://linkeddata.cultureelerfgoed.nl/def/ceo#> PREFIX skos: <http://www.w3.org/2004/02/skos/core#> SELECT ?monument ?nr ?of ?style WHERE { VALUES ?monument { ' + vals + ' } ?monument ceo:rijksmonumentnummer ?nr ; ceo:heeftOorspronkelijkeFunctie/ceo:heeftFunctieNaam/skos:prefLabel ?of . OPTIONAL { ?monument ceo:heeftStijlEnCultuur/ceo:heeftStijlEnCultuurNaam/skos:prefLabel ?style } }')
    time.sleep(1)
d = {}
for r in det: d.setdefault(r['monument'], []).append(r)
rows = [(x['building'], x['name'], r['nr'], r.get('style'), r['of']) for x in b for r in d.get(x['monument'], [])]
print('RCE detail rows', len(det), 'GT result rows (bag)', len(rows), 'distinct', len(set(rows)), 'buildings', len({r[0] for r in rows}))
json.dump(sorted(set(rows), key=str), open('groundtruth/q6.json', 'w'), indent=0)
