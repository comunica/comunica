// Mocked HDT package
module.exports = {
  __setMockedDocument: function(hdtDocument) {
    this.hdtDocument = hdtDocument;
  },
  fromFile: function (file) {
    if (!file) {
      return Promise.reject(new Error('File not found'));
    } else {
      return Promise.resolve(this.hdtDocument);
    }
  }
};
