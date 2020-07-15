const stringToStream = require('streamify-string');

class EngineMock4 {
  constructor(){

  }

  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject("Rejected query");
    }
    return {type: "bindings"};
  }

  resultToString(queryResult, mediaType){
    let result = stringToStream("test_query_result");
    console.log("result to string");
    console.log(result);
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

function newEngineDynamic4(options) {
  let mock = new EngineMock4();
  mock.invalidateHttpCache = jest.fn();

  if (options && options.mainModulePath === "rejecting_engine_promise") {
    return Promise.reject("REASON");
  } else {
    return Promise.resolve(mock);
  }
}

module.exports = {
  newEngineDynamic4: newEngineDynamic4,
};
