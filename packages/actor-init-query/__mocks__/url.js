function parse(url, _parseQueryString) {
  if (url === 'url_sparql') {
    return {
      pathname: '/sparql',
      query: { query: 'test_query' },
    };
  }
  if (url === 'url_undefined_query') {
    return {
      pathname: '/sparql',
      query: {},
    };
  }
  if (url === 'url_sparql_update_param') {
    return {
      pathname: '/sparql',
      query: { update: 'CLEAR ALL' },
    };
  }
  if (url === 'url_sparql_dataset') {
    return {
      pathname: '/sparql',
      query: {
        query: 'test_query',
        'default-graph-uri': 'http://example.org/g1',
        'named-graph-uri': [ 'http://example.org/n1', 'http://example.org/n2' ],
      },
    };
  }
  if (url === 'url_sparql_using') {
    return {
      pathname: '/sparql',
      query: { 'using-graph-uri': 'http://example.org/g1' },
    };
  }
  if (url === 'url_sparql_multiple_queries') {
    return {
      pathname: '/sparql',
      query: { query: [ 'test_query', 'other_test_query' ]},
    };
  }
  return {
    pathname: 'not_sparql_path',
    query: { query: 'test_query' },
  };
}

module.exports = {
  parse,
};
