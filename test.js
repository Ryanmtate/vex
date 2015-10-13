'use strict';

var Vex = require('./index.js');
var net = require('net');
var path = require('path');

console.log(Vex.getPrivateNetworkArguments());

Vex.Personal.newAccount('white', 'rabbit', function(address, password){
	Vex.Personal.unlockAccount(address, password, 200, function(data){
		console.log(data);
	});
});

Vex.TxPool.status(function(pending, queued){
	console.log(pending);
	console.log(queued);
});

Vex.Admin.chainSyncStatus(function(blocksAvailable, blocksWaitingForImport, estimate, importing){
	console.log(blocksAvailable)
	console.log(blocksWaitingForImport)
	console.log(estimate)
	console.log(importing)
});

Vex.Admin.verbosity(4, function(data){
	console.log(data);
});

Vex.Admin.nodeInfo(function(data){
	console.log(data);
});