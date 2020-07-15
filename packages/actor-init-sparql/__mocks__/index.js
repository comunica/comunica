const stringToStream = require('streamify-string');

class EngineMock {
  constructor(){}

  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return Promise.resolve();
  }

  resultToString(queryResult, mediaType){
    let result = stringToStream("test_query_result");
    if (mediaType === "mediatype_queryresultstreamerror"){
      result.pipe = () => result.emit('error', new Error('error'));
    } else if (mediaType === "mediatype_throwerror") {
      throw new Error("error");
    }
    return Promise.resolve({data: result});
  }

  getResultMediaTypes(context){
    return {
      "application/trig": 0.4, "stats": 1, "application/json": 1, "simple": 0.5,
    }
  }

  getResultMediaTypeFormats(context) {
    return {
        "application/trig": "ONE","stats": "TWO","application/json": "THREE", "simple": "FOUR",
    }
  }
}

class EngineMockQuads extends EngineMock {
  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return {type: "quads"};
  }

  resultToString(queryResult, mediaType){
    super.resultToString(queryResult, mediaType);
  }

  getResultMediaTypes(context){
    super.getResultMediaTypes(context);
  }

  getResultMediaTypeFormats(context) {
    super.getResultMediaTypeFormats(context);
  }
}

class EngineMockBoolean extends EngineMock {
  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return {type: "boolean"};
  }

  resultToString(queryResult, mediaType){
    super.resultToString(queryResult, mediaType);
  }

  getResultMediaTypes(context){
    super.getResultMediaTypes(context);
  }

  getResultMediaTypeFormats(context) {
    super.getResultMediaTypeFormats(context);
  }
}

class EngineMockBindings extends EngineMock {
  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return {type: "bindings"};
  }

  resultToString(queryResult, mediaType){
    super.resultToString(queryResult, mediaType);
  }

  getResultMediaTypes(context){
    super.getResultMediaTypes(context);
  }

  getResultMediaTypeFormats(context) {
    super.getResultMediaTypeFormats(context);
  }
}

class EngineMockOther extends EngineMock {
  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return {type: "other"};
  }

  resultToString(queryResult, mediaType){
    super.resultToString(queryResult, mediaType);
  }

  getResultMediaTypes(context){
    super.getResultMediaTypes(context);
  }

  getResultMediaTypeFormats(context) {
    super.getResultMediaTypeFormats(context);
  }
}

function newEngineDynamic(options) {
  let mock = new EngineMock();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

function newEngineDynamicQuads(options) {
  let mock = new EngineMockQuads();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

function newEngineDynamicBoolean(options) {
  let mock = new EngineMockBoolean();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

function newEngineDynamicBindings(options) {
  let mock = new EngineMockBindings();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

function newEngineDynamicOther(options) {
  let mock = new EngineMockOther();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

module.exports = {
  newEngineDynamic: newEngineDynamic,
  newEngineDynamicQuads: newEngineDynamicQuads,
  newEngineDynamicBoolean: newEngineDynamicBoolean,
  newEngineDynamicBindings: newEngineDynamicBindings,
  newEngineDynamicOther: newEngineDynamicOther,
};
