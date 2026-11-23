"""Usage: toggle.py sd=on|off batch=on|off push=on|off (edits the engine config in place)"""
import sys, re
args = dict(a.split('=') for a in sys.argv[1:])
import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../engines/config-query-sparql/config/')
p = root + 'query-source-dereference-link/actors.json'
s = open(p).read()
s = re.sub(r'"serviceDescriptionsInBackground": (true|false)', f'"serviceDescriptionsInBackground": {"true" if args["sd"] == "on" else "false"}', s)
open(p, 'w').write(s)
p = root + 'query-source-identify-hypermedia/actors-v5-1-0.json'
s = open(p).read()
s = re.sub(r'\n      "countBatchSize": \d+,', '', s)
if args['batch'] == 'off':
    s = s.replace('"mediatorQuerySerialize": { "@id": "urn:comunica:default:query-serialize/mediators#main" },\n      "sparqlServerSoftwarePatterns"', '"mediatorQuerySerialize": { "@id": "urn:comunica:default:query-serialize/mediators#main" },\n      "countBatchSize": 0,\n      "sparqlServerSoftwarePatterns"', 1)
open(p, 'w').write(s)
p = root + 'optimize-query-operation/actors-v5-4-1.json'
s = open(p).read()
s = re.sub(r'\n      "minCardinality": \d+,', '', s)
if args['push'] == 'off':
    s = s.replace('"@type": "ActorOptimizeQueryOperationPushSourceJoins",', '"@type": "ActorOptimizeQueryOperationPushSourceJoins",\n      "minCardinality": 1000000000000000,', 1)
open(p, 'w').write(s)
