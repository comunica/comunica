function parse(url, parseQueryString) {
  if (url === "url_sparql"){
    return {
      pathname: "/sparql",
      query: {query: "test_query",},
    };
  } else if (url === "url_undefined_query") {
    return {
      pathname: "/sparql",
      query: {},
    };
  }
  return {
    pathname: "not_sparql_path",
    query: {query: "test_query",},
  };
}

module.exports = {
  parse,
};
