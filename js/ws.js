// client-side web sockets
var socket = {
	removePlayer: function(account){
		var o = {
			type: 'remove',
			account: my.account
		}
		// removes id
		socket.zmq.publish('title:' + my.channel, o);
		delete title.players[account];
	},
	addPlayer: function(account, flag){
		var o = {
			type: 'add',
			account: my.account,
			flag: my.flag
		}
		socket.zmq.publish('title:' + my.channel, o);
		title.players[account] = {
			flag: flag
		}
	},
	setChannel: function(channel){
		// change channel on title screen
		if (g.view === 'title'){
			// remove from channel
			$.ajax({
				type: "POST",
				url: "php/titleChangeChannel.php",
				data: {
					channel: channel
				}
			}).done(function(data){
				console.info("NEW CHANNEL: " + data);
				// removes id
				socket.removePlayer(my.account);
				// unsubs
				try {
					socket.zmq.unsubscribe('title:' + my.channel);
				} catch(err){
					console.warn(err);
				}
				// set new channel data
				my.channel = data.channel;
				for (var key in title.players){
					delete title.players[key];
				}
				title.chat("You have joined channel: " + data.channel + ".", "chat-warning");
				socket.zmq.subscribe('title:' + data.channel, function(topic, data) {
					title.chatReceive(data);
				});
				// add id
				socket.addPlayer(my.account, my.flag);
				// update display of channel
				document.getElementById('titleChatHeaderChannel').textContent = data.channel;
				document.getElementById('titleChatBody').innerHTML = '';
				title.updatePlayers();
			});
		}
	},
	enableWhisper: function(){
		var channel = 'account:' + my.account;
		console.info("Subscribing to " + channel);
		socket.zmq.subscribe(channel, function(topic, data) {
			console.warn(data);
			if (data.message){
				if (data.action === 'send'){
					// message sent to user
					var msg = data.flag + data.account + ' whispers: ' + data.message;
					title.receiveWhisper(msg, 'chat-whisper');
					$.ajax({
						url: 'php/insertWhisper.php',
						data: {
							action: "",
							account: data.account,
							message: data.message
						}
					});
				} else {
					// message receive confirmation to original sender
					var msg = data.flag + 'To ' + data.account + ': ' + data.message;
					title.receiveWhisper(msg, 'chat-whisper');
				}
			}
		});
		(function keepAliveWs(){
			socket.zmq.publish(channel, {type: "keepAlive"});
			setTimeout(keepAliveWs, 180000);
		})();
	},
	joinGame: function(){
		(function repeat(){
			if (socket.enabled){
				try {
					socket.zmq.unsubscribe('title:' + my.channel);
				} catch(err){
					console.warn(err);
				}
				// game updates
				console.info("Subscribing to game:" + game.id);
				socket.zmq.subscribe('game:' + game.id, function(topic, data) {
					title.chatReceive(data);
				});
			} else {
				setTimeout(repeat, 100);
			}
		})();
	},
	enabled: false,
	connectionTries: 0,
	connectionRetryDuration: 250,
	init: function(){
		// is player logged in?
		var e = document.getElementById('titleMenu');
		if (e !== null){
			socket.zmq = new ab.Session('wss://' + location.hostname + '/wss2/', function(){
				socket.connectionSuccess();
			}, function(){
				socket.connectionFailure();
			}, {
				'skipSubprotocolCheck': true
			});
		}
	},
	connectionSuccess: function(){
		console.info("Socket connection established with server:", g.view);
		// chat updates
		title.chat("You have joined channel: " + my.channel + ".", "chat-warning");
		socket.zmq.subscribe('title:' + my.channel, function(topic, data) {
			title.chatReceive(data);
		});
		socket.enabled = true;
		(function repeat(){
			if (my.account){
				socket.enableWhisper();
			} else {
				setTimeout(repeat, 200);
			}
		})();
	},
	connectionFailure: function(){
		console.warn('WebSocket connection failed. Retrying...');
		socket.enabled = false;
		if (++socket.connectionTries * socket.connectionRetryDuration < 60000){
			setTimeout(socket.init, socket.connectionRetryDuration);
		}
	}
}
socket.init();