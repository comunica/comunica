// Mocked HDT package
module.exports = {
  __setMockedDocument: function(hdtDocument) {
    this.hdtDocument = hdtDocument;
  },
  fromFile: function (file, cb) {
    if (!file) {
      cb(new Error('File not found'));
    } else {
      cb(null, this.hdtDocument);
    }
  }
};
