'use strict';

var Vex = require('./index.js');
var net = require('net');
var path = require('path');

Vex.joinNetwork();


setTimeout(function(){
	Vex.Web3().version.getNetwork(function(err, result){
		console.log(err);
		console.log(result);
	})
}, 12000);


