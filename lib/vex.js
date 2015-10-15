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
var vexNetwork = String('geth --networkid='+privateNetworkId+' --genesis '+privateGenesis+' --datadir='+privateDatadir+' --ipcpath='+gethSocket);

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
exports.joinVexNetwork = function(){
	// This function currently does not work, defaulting to the main Ethereum directories... 
	// To enable, set your geth arguments manually and launch geth using geth on the command line.	


	var settings =  String('  --networkid='+privateNetworkId+' --genesis '+privateGenesis+' --datadir='+privateDatadir+' --ipcpath='+gethSocket);
	//console.log(settings);
	var geth = spawn('geth', ['  --networkid='+privateNetworkId, ' --genesis '+privateGenesis, ' --datadir='+privateDatadir, ' --ipcpath='+gethSocket]);

	geth.stdout.setEncoding('utf8');
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
exports.joinNetwork = function(){
	var geth = exec(vexNetwork, function(error, stdout, stderr){
		console.log('stdout: ' + stdout);
	    console.log('stderr: ' + stderr);
	    if (error !== null) {
	      console.log('exec error: ' + error);
	    }
	})
};


var generatePassword = function(secret, salt, next){
	crypto.pbkdf2(secret, salt, 4096, 512, 'sha256', function(err, key) {
	  if (err)
	    throw err;
	  var pw = key.toString('hex').substring(0,20);
	  next(pw)
	});
};

exports.getPrivateNetworkArguments = function(){
	return vexNetwork;
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
	},
	peers : function(next){
		var payload = {jsonrpc: '2.0',method: 'admin_addPeer',params: [nodeUrl],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	startNatSpec : function(next){
		var payload = {jsonrpc: '2.0',method: 'admin_startNatSpec',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	getContractInfo : function(address, next){
		var payload = {jsonrpc: '2.0',method: 'admin_getContractInfo',params: [address],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	saveInfo : function(contractInfo, filename, next){
		var payload = {jsonrpc: '2.0',method: 'admin_getContractInfo',params: [contractInfo, filename],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	register : function(address, contractaddress, contenthash, next){
		var payload = {jsonrpc: '2.0',method: 'admin_register',params: [address, contractaddress, contenthash],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	registerUrl : function(address, codehash, contenthash, next){
		var payload = {jsonrpc: '2.0',method: 'admin_register',params: [address, codehash, contenthash],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	}
};

exports.Miner = {
	start : function(threadCount, next){
		var payload = {jsonrpc: '2.0',method: 'miner_start',params: [threadCount],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	stop : function(threadCount, next){
		var payload = {jsonrpc: '2.0',method: 'miner_stop',params: [threadCount],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	startAutoDAG : function(next){
		var payload = {jsonrpc: '2.0',method: 'miner_startAutoDAG',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	stopAutoDAG : function(next){
		var payload = {jsonrpc: '2.0',method: 'miner_stopAutoDAG',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	makeDAG : function(blockNumber, dir, next){
		var payload = {jsonrpc: '2.0',method: 'miner_makeDAG',params: [blockNumber, dir],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	hashrate : function(next){
		var payload = {jsonrpc: '2.0',method: 'miner_hashrate',params: [],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	setExtra : function(next){ // Set Extra Block data to include 'VΞX'
		var payload = {jsonrpc: '2.0',method: 'miner_setExtra',params: ["VΞNTURΞ ΞQUITY ΞXCHANGΞ"],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});	
	},
	setGasPrice : function(gasPrice, next){
		var payload = {jsonrpc: '2.0',method: 'miner_setGasPrice',params: [gasPrice],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	setEtherbase : function(account, next){
		var payload = {jsonrpc: '2.0',method: 'miner_setEtherbase',params: [account],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	}
}

exports.Debug = {
	setHead : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_setHead',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	seedHash : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_seedHash',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	processBlock : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_processBlock',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	getBlockRlp : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_getBlockRlp',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	printBlock : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_printBlock',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	dumpBlock : function(blockNumber, next){
		var payload = {jsonrpc: '2.0',method: 'debug_dumpBlock',params: [blockNumber],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	},
	metrics : function(raw, next){
		var payload = {jsonrpc: '2.0',method: 'debug_metrics',params: [raw],id: 1};
		gethIPC(payload, function(data){
			next(data.result);
		});
	}
};

exports.loadScript = function(filePath, next){
	var payload = {jsonrpc: '2.0',method: 'loadScript',params: [filePath],id: 1};
	gethIPC(payload, function(data){
		next(data.result);
	});
};

exports.sleep = function(seconds, next){
	var payload = {jsonrpc: '2.0',method: 'sleep',params: [seconds],id: 1};
	gethIPC(payload, function(data){
		next(data.result);
	});
};

exports.Web3 = function(){
	web3.setProvider(new web3.providers.IpcProvider(gethSocket, net));
	return web3;
};
	






