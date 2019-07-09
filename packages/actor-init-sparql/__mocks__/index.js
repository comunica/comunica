const stringToStream = require('streamify-string');

class EngineMock {
  constructor(){

  }

  query(sparql, context){ // deze methode mag teruggeven wat hij maar wilt, aangezien het resultaat enkel wordt doorgegeven naar resultToString
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
      "mtype_1": 1,"mtype_2": 2,"mtype_3": 3, "mtype_4": 4,
    }
  }
}

function newEngineDynamic(options) {
  let mock = new EngineMock();
  mock.invalidateHttpCache = jest.fn();

  return Promise.resolve(mock);
}

module.exports = {
  newEngineDynamic: newEngineDynamic,
};
