// Set up the sinon stubbing library
(<any> global).sinon = require('sinon');

// Set up the Chai assertion library
let chaiModule = require('chai');
(<any> global).test = {};
(<any> global).expect = chaiModule.expect;
(<any> global).should = chaiModule.should();
chaiModule.use(require('sinon-chai'));
chaiModule.use(require('chai-as-promised'));
