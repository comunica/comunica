const stringToStream = require('streamify-string');
const { ActionContext } = require('@comunica/core');

class EngineMock {
  constructor(){

  }

  query(sparql, context){
    if (sparql === "query_reject"){
      return Promise.reject(new Error("Rejected query"));
    }
    return Promise.resolve({ type: 'bindings', context: ActionContext.ensureActionContext(context) });
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

  queryBindings() {
    return {
      on: (event, func) => {
        if (event === 'end') {
          func();
        }
      }
    };
  }

  getResultMediaTypes(context){
    return {
      "mtype_1": 1,"mtype_2": 2,"mtype_3": 3, "mtype_4": 4,
    }
  }

  getResultMediaTypeFormats(context) {
    return {
      "mtype_1": 'ONE', "mtype_2": 'TWO', "mtype_3": 'THREE', "mtype_4": 'FOUR',
    }
  }
}

class QueryEngineFactoryBase {
  constructor(module, config, queryEngineFactory) {
    if (queryEngineFactory)
      queryEngineFactory();
  }

  create(options) {
    let mock = new EngineMock();
    mock.invalidateHttpCache = jest.fn();

    if (options && options.mainModulePath === "rejecting_engine_promise") {
      return Promise.reject("REASON");
    } else {
      return Promise.resolve(mock);
    }
  }
}

module.exports = {
  QueryEngineFactoryBase: QueryEngineFactoryBase,
  QueryEngineBase: require('../lib/QueryEngineBase').QueryEngineBase,
};
