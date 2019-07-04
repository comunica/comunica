class EngineMock {
  constructor(){

  }

  getResultMediaTypes() {

  }
}

function newEngineDynamic(options) {
  console.log("newEngineDynamic Mock called!");
  return Promise.resolve(new EngineMock());
}

module.exports = {
  newEngineDynamic: newEngineDynamic,
};
