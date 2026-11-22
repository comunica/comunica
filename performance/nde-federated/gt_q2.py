import json, urllib.request, urllib.parse, ssl, sys, time
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query, timeout=180):
    data = urllib.parse.urlencode({'query': query}).encode()
    req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
GO='https://www.genealogieonline.nl/wo2slachtoffers/sparql'; W='https://sparql.ldmax.nl/wo2net'; N='https://data.niod.nl/PoolParty/sparql/WO2_Thesaurus'
vict = q(GO, 'PREFIX schema: <https://schema.org/> SELECT ?victim ?name ?deathDate ?warLife WHERE { ?victim schema:deathPlace <https://data.niod.nl/WO2_Thesaurus/kampen/4884> ; schema:name ?name ; schema:deathDate ?deathDate ; schema:sameAs ?warLife }')
print('victims with sameAs', len(vict), 'distinct victims', len({v['victim'] for v in vict}))
wl = sorted({v['warLife'] for v in vict})
bps = {}
for i in range(0, len(wl), 100):
    vals = ' '.join(f'<{a}>' for a in wl[i:i+100])
    for r in q(W, f'SELECT ?w ?bp WHERE {{ VALUES ?w {{ {vals} }} ?w <https://schema.org/birthPlace> ?bp FILTER(isIRI(?bp)) }}'):
        bps.setdefault(r['w'], set()).add(r['bp'])
allbp = sorted({b for s in bps.values() for b in s})
lab = {}
for i in range(0, len(allbp), 100):
    vals = ' '.join(f'<{a}>' for a in allbp[i:i+100])
    for r in q(N, f'SELECT DISTINCT ?bp ?l WHERE {{ VALUES ?bp {{ {vals} }} ?bp <http://www.w3.org/2004/02/skos/core#prefLabel> ?l FILTER(LANG(?l)="nl") }}'):
        lab.setdefault(r['bp'], set()).add(r['l'])
rows = set()
for v in vict:
    for b in bps.get(v['warLife'], []):
        for l in lab.get(b, []):
            rows.add((v['victim'], v['name'], v['deathDate'], l))
print('warLife with IRI birthplace', len(bps), 'labelled birthplaces', len(lab), 'distinct result rows', len(rows), 'distinct victims', len({r[0] for r in rows}))
