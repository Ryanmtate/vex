var web3 = require('web3');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var execFile = require('child_process').execFile;
var net = require('net');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var moduledir = path.dirname(require.main.filename);
var privateGenesis = path.join(moduledir, '/lib/genesis.json');
var gethlog = path.join(moduledir, '/lib/gethlog.json');
var privateDatadir = path.join(moduledir, '/lib/.ethereum');
var privateNetworkId = '112358';
var gethSocket = path.join(moduledir, '/lib/.ethereum/geth.ipc');

exports.gethInstalled = function(next){
	var geth = spawn('geth', ['version']);
    
    // add a 'data' event listener for the spawn instance
    geth.stdout.setEncoding('utf8');
    
    geth.stdout.on('data', function(data) {
    	var geth = new RegExp('Geth');
    	var result = data.match(geth)
    	if(result == null){
    		next(false);	
    	} else {
    		next(true, data);
    	};
    });
    
    // add an 'end' event listener to close the writeable stream
    geth.stdout.on('end', function(data) {
        //console.log(data);
    });

    // when the spawn child process exits, check if there were any errors and close the writeable stream
    geth.on('exit', function(code) {
        if (code != 0) {
            console.log('Failed: ' + code);
        }
    });
};

exports.getGeth = function(){
	switch(process.platform){
		case 'darwin':
			console.log('Platform is: '+process.platform);
			break;
		case 'linux':
			console.log('Platform is: '+process.platform);
			break;
		case 'win32':
			console.log('Platform is: '+process.platform);
			break;
		default:
			console.log('Sorry, '+process.platform+' is unsupported right now.');
			break;
	};
};


/*
exports.joinPrivateNetwork = function(){
	// This function currently does not work, defaulting to the main Ethereum directories... 
	// To enable, set your geth arguments manually and launch geth using geth on the command line.	


	var settings =  String(' --networkid='+privateNetworkId+' --genesis '+privateGenesis+' --datadir='+privateDatadir+' --ipcpath='+gethSocket);
	console.log(settings);
	var geth = spawn('geth', [settings]);

	geth.stdout.setEncoding('utf8');
	geth.stderr.setEncoding('utf8');
	geth.stdout.on('data', function(data){
		console.log(data);
	});

	geth.stderr.on('data', function(data){
		console.log(data);
	});

	geth.stdout.on('end', function(data) {
        
        console.log(data);
    });
    // when the spawn child process exits, check if there were any errors and close the writeable stream
    geth.on('exit', function(code) {
        if (code != 0) {
            console.log('Failed: ' + code);
        }
    });


	//geth.unref();
	
	console.log(geth.pid);
};
*/

var generatePassword = function(secret, salt, next){
	crypto.pbkdf2(secret, salt, 4096, 512, 'sha256', function(err, key) {
	  if (err)
	    throw err;
	  var pw = key.toString('hex').substring(0,20);
	  next(pw)
	});
};

exports.getPrivateNetworkArguments = function(){
	return String('geth --networkid='+privateNetworkId+' --genesis '+privateGenesis+' --datadir='+privateDatadir+' --ipcpath='+gethSocket);
};

var gethIPC = function(payload, next){
	if(payload == null){
		console.log('no payload');
		return error;
	};

	var client = net.connect({path: gethSocket}, function() {
        //console.log('connected to server!');
        //console.log(payload);
        client.end(JSON.stringify(payload));
	});

	client.on('connection', function(d){
		console.log(d)
		//console.log('connected');
	});

	client.on('data', function(data) {
		var response = "";
		response += data.toString();
		var res = JSON.parse(response);
	   	next(res)
	});

	client.on('end', function() {
	    //console.log('disconnected from server');
	});

	client.on('error', function(data){
		console.log(data);

	});

	process.on('SIGINT', function() {
	    console.log("Caught interrupt signal");

	    client.end();
	    process.exit();
	});
};

exports.Personal = {
	newAccount : function(secret, salt, next){
		generatePassword(secret, salt, function(pass){
			console.log('Password Generated: '+pass);
			var payload = {jsonrpc: '2.0',method: 'personal_newAccount',params: [pass],id: 1};
			gethIPC(payload, function(data){
				next(data.result, pass);
			});
		});
	},
	listAccounts : function(next){
		var payload = {jsonrpc: '2.0',method: 'personal_listAccounts',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	deleteAccount : function(address, password, next){
		var payload = {jsonrpc: '2.0',method: 'personal_deleteAccount',params: [address, password],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	unlockAccount : function(address, password, duration, next){
		var payload = {jsonrpc: '2.0',method: 'personal_unlockAccount',params: [address, password, duration],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	}
};

exports.TxPool = {
	status : function(next){
		var payload = {jsonrpc: '2.0',method: 'txpool_status',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result.pending, data.result.queued);
		});
	}
};

exports.Admin = {
	chainSyncStatus : function(next){
		var payload = {jsonrpc: '2.0',method: 'admin_chainSyncStatus',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result.blocksAvailable, data.result.blocksWaitingForImport, data.result.estimate, data.result.importing);
		});
	},
	verbosity : function(level, next){
		var payload = {jsonrpc: '2.0',method: 'admin_verbosity',params: [level],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	nodeInfo : function(next){
		var payload = {jsonrpc: '2.0',method: 'admin_nodeInfo',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	addPeer : function(nodeUrl, next){
		var payload = {jsonrpc: '2.0',method: 'admin_addPeer',params: [nodeUrl],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	}
};






