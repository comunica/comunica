"""Summarises the NDE runs of the clean integration branch against the baseline and the prototypes.

Usage: python3 clean_summary.py <baseline-dir> <clean-dir> [<prototype-dir>]
Prints one JSON object per query with results, distinct results, time, requests and decoded bytes.
"""
import json
import os
import sys

QUERIES = ['q1', 'q2', 'q3', 'q4', 'q4b', 'q5', 'q5b', 'q6', 'q6b', 'q7']
# Expected answers from the ground truth scripts (rows, or distinct rows where the query has duplicates)
EXPECTED = {
    'q1': (334, 'rows'), 'q2': (53, 'rows'), 'q3': (205, 'rows'), 'q4': (2026, 'distinct'),
    'q4b': (2022, 'rows'), 'q5': (711, 'items'), 'q5b': (711, 'items'), 'q6': (391, 'distinct'),
    'q6b': (73, 'distinct'), 'q7': (11, 'rows'),
}


def load(directory, query):
    path = os.path.join(directory, f'{query}.summary.json')
    if not os.path.exists(path):
        return None
    summary = json.load(open(path))
    results_path = os.path.join(directory, f'{query}.results.json')
    results = json.load(open(results_path)) if os.path.exists(results_path) else []
    distinct = len({json.dumps(r, sort_keys=True) for r in results})
    items = len({r.get('item') for r in results if isinstance(r, dict)})
    return {
        'status': summary['status'],
        'results': summary['results'],
        'distinct': distinct,
        'items': items,
        'timeMs': summary['timeMs'],
        'requests': summary['httpRequests'],
        'decodedBytes': summary['decodedBytes'],
        'error': summary.get('error'),
    }


def correct(query, run):
    if not run or run['status'] != 'ok':
        return False
    expected, kind = EXPECTED[query]
    value = {'rows': run['results'], 'distinct': run['distinct'], 'items': run['items']}[kind]
    return value == expected


def main():
    dirs = sys.argv[1:]
    for query in QUERIES:
        row = {'query': query, 'expected': EXPECTED[query]}
        for name, directory in zip(['base', 'clean', 'proto'], dirs):
            run = load(directory, query)
            if run:
                run['correct'] = correct(query, run)
            row[name] = run
        print(json.dumps(row))


if __name__ == '__main__':
    main()
