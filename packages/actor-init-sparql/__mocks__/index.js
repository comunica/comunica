class EngineMock {
  constructor(){

  }

  getResultMediaTypes() {

  }
}

function newEngineDynamic(options) {
  return Promise.resolve(new EngineMock());
}

module.exports = {
  newEngineDynamic: newEngineDynamic,
};
