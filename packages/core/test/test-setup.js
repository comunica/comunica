// Set up the sinon stubbing library
global.sinon = require('sinon');

// Set up the Chai assertion library
var chai = require('chai');
global.test = {};
global.expect = chai.expect;
global.should = chai.should();
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));