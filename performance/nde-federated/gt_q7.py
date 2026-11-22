import json, urllib.request, urllib.parse, ssl
ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
def q(url, query):
    data = urllib.parse.urlencode({'query': query}).encode()
    req = urllib.request.Request(url, data=data, headers={'Accept': 'application/sparql-results+json'})
    with urllib.request.urlopen(req, timeout=120, context=ctx) as r:
        return [{k: v['value'] for k, v in b.items()} for b in json.load(r)['results']['bindings']]
ls = q('https://sparql.netwerkdigitaalerfgoed.nl/dataset-knowledge-graph', 'PREFIX void: <http://rdfs.org/ns/void#> SELECT ?dataset ?links WHERE { ?l void:objectsTarget <https://data.niod.nl/WO2_Thesaurus> ; void:subjectsTarget ?dataset ; void:triples ?links }')
vals = ' '.join(f'<{r["dataset"]}>' for r in ls)
reg = q('https://datasetregister.netwerkdigitaalerfgoed.nl/sparql', 'PREFIX dcat: <http://www.w3.org/ns/dcat#> PREFIX dct: <http://purl.org/dc/terms/> PREFIX foaf: <http://xmlns.com/foaf/0.1/> SELECT DISTINCT ?dataset ?title ?publisher ?endpoint WHERE { VALUES ?dataset { ' + vals + ' } ?dataset dct:title ?title ; dct:publisher/foaf:name ?publisher ; dcat:distribution ?d . ?d dct:conformsTo <https://www.w3.org/TR/sparql11-protocol/> ; dcat:accessURL ?endpoint . FILTER(LANG(?title) = "en" || LANG(?title) = "") FILTER(LANG(?publisher) = "en" || LANG(?publisher) = "") }')
links = {}
for r in ls: links.setdefault(r['dataset'], set()).add(r['links'])
rows = {(r['dataset'], r['title'], r['publisher'], l, r['endpoint']) for r in reg for l in links[r['dataset']]}
print('linksets', len(ls), 'register rows', len(reg), 'GT rows', len(rows), 'datasets', len({r[0] for r in rows}))
for r in sorted(rows): print(r)
