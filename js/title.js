// title.js
var title = {
	players: [],
	games: [],
	getLeaderboard: function(type){
		var e = document.getElementById('leaderboardBody');
		e.innerHTML = '';
		g.lock();
		$.ajax({
			url: app.url + 'php/leaderboard.php',
			data: {
				type: type
			}
		}).done(function(data) {
			e.innerHTML = data.str;
			g.unlock();
		});
	},
	refreshTimer: 0,
	refreshGames: function(){
		if (Date.now() - title.refreshTimer > 5000){
			title.refreshTimer = Date.now();
			g.lock(1);

			$("#title-chat-input").focus();
			TweenMax.to('#refresh-game-button', 1, {
				rotation: "+=360",
				ease: Linear.easeIn
			});

			$.ajax({
				type: 'GET',
				url: app.url + 'php/refreshGames.php'
			}).done(function(data) {
				title.refreshGamesCallback(data.games);
			}).fail(function(e){
				console.info(e.responseText);
			}).always(function() {
				g.unlock();
			});
		}
	},
	refreshGamesCallback: function(data) {
		var e = document.getElementById('gameTableBody');
		if (e === null) return;
		// head
		var str = '';
		// body
		for (var i=0, len=data.length; i<len; i++){
			var d = data[i];
			title.games[d.id] = d.players * 1;
			str +=
			"<tr id='game_"+ d.id +"' class='shadow4 wars wars-"+ d.gameMode +" no-select' data-name='" + d.name + "'>\
				<td class='warCells'>"+ d.name + "</td>\
				<td class='warCells'>" + d.map + "</td>\
				<td class='warCells'>" + d.gameMode + "</td>\
			</tr>";

		}
		e.innerHTML = str;
	},
	init: (function(){
		$(document).ready(function(){
			// console.info("Initializing title screen...");
			// prevents auto scroll while scrolling
			$("#titleChatLog").on('mousedown', function(){
				title.chatDrag = true;
			}).on('mouseup', function(){
				title.chatDrag = false;
			});
			$("#title-chat-input").on('focus', function(){
				title.chatOn = true;
			}).on('blur', function(){
				title.chatOn = false;
			});
			$(".createGameInput").on('focus', function(){
				title.createGameFocus = true;
			}).on('blur', function(){
				title.createGameFocus = false;
			});
			$("#login-container").on(ui.click, '.nw-link', function() {
				title.openWindow($(this).attr('href'));
			})
			/*$("#titleChatSend").on(ui.click, function(){
				title.sendMsg(true);
			});*/
			// initial refresh of games
			setTimeout(function(){
				g.keepAlive();
			}, 180000);
		});
	})(),
	updateTimer: 0,
	updatePlayers: function(once){
		clearTimeout(title.updateTimer);
		title.titleUpdate = $("#titleChatPlayers").length; // player is logged in
		if (title.titleUpdate) {
			// see self in lobby upon login
			title.addPlayer(my.account, my.flag, my.rating);
			// title chat loop
			(function repeat(){
				if (isLoggedIn && g.view === 'title'){
					$.ajax({
						type: "POST",
						url: app.url + "php/titleUpdate.php",
						data: {
							channel: my.channel
						}
					}).done(function(data){
						console.info('titleUpdate.php', JSON.parse(JSON.stringify(title.players)));
						console.info('data', data);
						title.updatePlayerCallback(data);
					}).always(function(){
						if (!once){
							title.updateTimer = setTimeout(repeat, 5000);
						}
					});
				}
			})();
		} else {
			// not logged in
			$("#titleChat, #titleMenu").remove();
		}
	},
	updatePlayerCallback: function(data) {
		// set title players
		if (g.view === 'title'){
			if (data.playerData !== undefined){
				var p = data.playerData,
					foundPlayers = [];
				for (var i=0, len=p.length; i<len; i++){
					// add new players
					var account = p[i].account,
						flag = p[i].flag,
						rating = p[i].rating;
					if (title.players[account] === undefined){
						console.info("ADDING PLAYER: ", p[i]);
						title.addPlayer(account, flag, rating);
					}
					else if (title.players[account].flag !== flag){
						// replace player flag
						var flagElement = document.getElementById("titlePlayerFlag_" + account);
						if (flagElement !== null){
							flagElement.src = 'images/flags/' + flag;
						}
					}
					foundPlayers.push(account);
				}
				// remove missing players
				for (var key in title.players){
					if (foundPlayers.indexOf(key) === -1){
						var x = {
							account: key
						}
						// console.info("REMOVING PLAYER: " + x.account);
						title.removePlayer(x);
					}
				}
			}
			document.getElementById('titleChatHeaderCount').textContent = len !== undefined ? '('+len+')' : '';
			// game data sanity check
			var serverGames = [];
			if (data.gameData !== undefined){
				var p = data.gameData;
				for (var i=0, len=p.length; i<len; i++){
					serverGames[p[i].id] = {
						players: p[i].players * 1,
						max: p[i].max * 1
					}
				}
			}
			// remove games if they're not found in server games
			title.games.forEach(function(e, ind){
				// console.info(serverGames[ind]);
				if (serverGames[ind] === undefined){
					// game timed out, not found
					var o = {
						id: ind
					}
					console.info("REMOVING: ", o);
					title.removeGame(o);
				}
				else {
					// found game
					if (serverGames[ind].players !== title.games[ind]){
						// player count does not match... fixing
						// console.info("PLAYER COUNT WRONG!");
						var o = {
							id: ind,
							players: serverGames[ind].players,
							max: serverGames[ind].max
						}
						title.setToGame(o);
					}
				}
			});
		}
	},
	// adds player to chat room
	addPlayer: function(account, flag, rating){
		console.info("title.addPlayer 2", account, flag, rating);
		title.players[account] = {
			flag: flag
		}
		var e = document.getElementById('titlePlayer' + account);
		if (e !== null){
			e.parentNode.removeChild(e);
		}
		var e = document.createElement('div');
		e.className = "titlePlayer";
		e.id = "titlePlayer" + account;
		e.innerHTML =
			'<img id="titlePlayerFlag_'+ account +'" class="flag" src="images/flags/'+ flag +'">' +
			'<span class="chat-rating">['+ rating +']</span> '+
			'<span class="titlePlayerAccount">'+ account +'</span>';
		if (account && flag && title.titleUpdate){
			DOM.titleChatBody.appendChild(e);
		}
	},
	removePlayer: function(data){
		// fix this
		delete title.players[data.account];
		var z = document.getElementById('titlePlayer' + data.account);
		if (z !== null){
			z.parentNode.removeChild(z);
		}
	},
	updateGame: function(data){
		console.info("title.updateGame");
		if (data.type === 'addToGame'){
			title.addToGame(data);
		} else if (data.type === 'removeFromGame'){
			title.removeFromGame(data);
		} else if (data.type === 'addGame'){
			title.addGame(data);
		} else if (data.type === 'removeGame'){
			title.removeGame(data);
		}
	},
	updatePlayerText: function(id){
		var e = document.getElementById('game_players_' + id);
		if (e !== null){
			e.textContent = title.games[id];
		}
	},
	setToGame: function(data){
		// refreshGames corrects player values
		// console.info("setToGame", data);
		var id = data.id;
		title.games[id] = data.players;
		// title.updatePlayerText(id);
	},
	addToGame: function(data){
		// player joined or left
		//console.info("addToGame", data);
		var id = data.id;
		if (title.games[id] !== undefined){
			if (title.games[id] + 1 > data.max){
				title.games[id] = data.max;
			} else {
				title.games[id]++;
			}
		} else {
			title.games[id] = 1;
		}
		//title.updatePlayerText(id);
	},
	removeFromGame: function(data){
		// player joined or left
		//console.info("removeFromGame", data);
		var id = data.id;
		if (title.games[id] !== undefined){
			if (title.games[id] - 1 < 1){
				title.games[id] = 1;
			} else {
				title.games[id]--;
			}
		} else {
			title.games[id] = 1;
		}
		//title.updatePlayerText(id);
	},
	addGame: function(data){
		// created game
		// console.info("addGame", data);
		title.games[data.id] = 1;
		var e = document.createElement('tr'),
			gameMode = data.gameMode === 'Ranked' ? 'Ranked' : data.gameMode === 'Team' ? 'Team' : 'FFA';
		e.id = 'game_' + data.id;
		e.className = 'shadow4 wars wars-'+ gameMode +' no-select';
		e.setAttribute('data-name', data.name);
		e.innerHTML = 
			"<td class='warCells'>"+ data.name + "</td>\
			<td class='warCells'>" + data.map + "</td>\
			<td class='warCells'>" + gameMode + "</td>";
		DOM.gameTableBody.insertBefore(e, DOM.gameTableBody.childNodes[0]);
	},
	removeGame: function(data){
		// game countdown started or exited
		// console.info("removeGame", data);
		delete title.games[data.id];
		var e = document.getElementById('game_' + data.id);
		if (e !== null){
			e.parentNode.removeChild(e);
		}
	},
	mapData: {
		EarthOmega: {
			name: 'Earth Omega',
			tiles: 78,
			players: 8
		},
		/*EarthAlpha: {
			name: 'Earth Alpha',
			tiles: 83,
			players: 8
		},*/
		/*
		FlatEarth: {
			name: 'Flat Earth',
			tiles: 78,
			players: 8
		},*/
		France: {
			name: 'France',
			tiles: 81,
			players: 8
		},
		Germany: {
			name: 'Germany',
			tiles: 499,
			players: 8
		},
		Italy: {
			name: 'Italy',
			tiles: 81,
			players: 8
		},
		Japan: {
			name: "Japan",
			tiles: 47,
			players: 3
		},
		Turkey: {
			name: "Turkey",
			tiles: 75,
			players: 7
		},
		UnitedKingdom: {
			name: "United Kingdom",
			tiles: 69,
			players: 8
		},
		UnitedStates: {
			name: 'United States',
			tiles: 48,
			players: 2
		}
	},
	chatDrag: false,
	chatOn: false,
	scrollBottom: function(){
		if (!title.chatDrag){
			DOM.titleChatLog.scrollTop = DOM.titleChatLog.scrollHeight;
		}
	},
	chat: function (data){
		if (g.view === 'title' && data.message){
			while (DOM.titleChatLog.childNodes.length > 500) {
				DOM.titleChatLog.removeChild(DOM.titleChatLog.firstChild);
			}
			if (data.type === 'inserted-image'){
				(function repeat(count){
					if (++count < 10){
						title.scrollBottom();
						setTimeout(repeat, 200, count);
					}
				})(0);
			}
			var z = document.createElement('div'); 
			if (data.type){
				z.className = data.type;
			}
			z.innerHTML = data.message;
			DOM.titleChatLog.appendChild(z);
			title.scrollBottom();
			/*
			if (!data.skip){
				g.sendNotification(data);
			}
			*/
		}
	},
	friendGet: function(){
		// friend list
		g.friends = [];
		$.ajax({
			type: 'GET',
			url: app.url + 'php/friendGet.php',
		}).done(function(data){
			title.friendGetCallback(data.friends);
		});
	},
	friendGetCallback: function(data) {
		data.forEach(function(friend){
			g.friends.push(friend);
		});
	},
	toggleFriend: function(account){
		account = account.trim();
		if (account !== my.account){
			console.info('toggle: ', account, account.length);
			$.ajax({
				url: app.url + 'php/friendToggle.php',
				data: {
					account: account
				}
			}).done(function(data){
				if (data.action === 'fail'){
					g.chat('You cannot have more than 20 friends!');
				} else if (data.action === 'remove'){
					g.chat('Removed '+ account +' from your friend list');
					title.friendGet();
				} else if (data.action === 'add'){
					g.chat('Added '+ account +' to your friend list');
					title.friendGet();
				}
			});
		} else {
			// cannot add yourself
			g.chat("You can't be friends with yourself!", 'chat-muted');
		}
	},
	listIgnore: function(){
		var len = g.ignore.length;
		g.chat('<div>Ignore List ('+ len +')</div>');
		for (var i=0; i<len; i++){
			var str = '<div><span class="chat-muted titlePlayerAccount">' + g.ignore[i] +'</span></div>';
			g.chat(str);
		}
	},
	addIgnore: function(account){
		account = account.toLowerCase().trim();
		g.chat('<div>Ignoring '+ account +'</div>');
		if (g.ignore.indexOf(account) === -1 && account){
			if (g.ignore.length < 20){
				if (account !== my.account){
					g.ignore.push(account);
					localStorage.setItem('ignore', JSON.stringify(g.ignore));
					g.chat('Now ignoring account: ' + account, 'chat-muted');
				} else {
					g.chat("<div>You can't ignore yourself!</div><img src='images/chat/random/autism.jpg'>", 'chat-muted');
				}
			} else {
				g.chat('You cannot ignore more than 20 accounts!', 'chat-muted');
			}
		} else {
			g.chat('Already ignoring ' + account +'!', 'chat-muted');
		}
	},
	removeIgnore: function(account){
		account = account.toLowerCase().trim();
		if (account && g.ignore.indexOf(account) > -1){
			// found account
			var index = g.ignore.indexOf(account);
			g.ignore.splice(index, 1);
			localStorage.setItem('ignore', JSON.stringify(g.ignore));
			g.chat('Stopped ignoring account: ' + account, 'chat-muted');
		} else {
			g.chat(account + ' is not on your ignore list.', 'chat-muted');
		}
	},
	chatReceive: function(data){
		if (g.view === 'title'){
			// title
			if (data.type === 'remove'){
				title.removePlayer(data);
			} else if (data.type === 'add'){
				title.addPlayer(data.account, data.flag, data.rating);
			} else {
				if (data.message !== undefined){
					title.chat(data);
				}
			}
		} else if (g.view === 'lobby'){
			// lobby
			//console.info('lobby receive: ', data);
			if (data.type === 'hostLeft'){
				lobby.hostLeft();
			} else if (data.type === 'lobby-set-cpu-difficulty'){
				lobby.updateDifficulty(data);
			} else if (data.type === 'updateGovernment'){
				lobby.updateGovernment(data);
			} else if (data.type === 'updatePlayerColor'){
				lobby.updatePlayerColor(data);
			} else if (data.type === 'updateTeamNumber'){
				lobby.updateTeamNumber(data);
			} else if (data.type === 'countdown'){
				lobby.countdown(data);
			} else if (data.type === 'updateLobbyPlayer'){
				lobby.updatePlayer(data);
			} else if (data.type === 'updateLobbyCPU'){
				lobby.updateCPU(data);
			} else {
				if (data.message !== undefined){
					lobby.chat(data);
				}
			}
		} else {
			// game
			// console.info('game receive: ', data);
			if (data.type === 'cannons'){
				animate.cannons(data.attackerTile, data.tile, true);
				game.updateTile(data);
			} else if (data.type === 'missile'){
				animate.missile(data.attacker, data.defender, true);
			} else if (data.type === 'nuke'){
				setTimeout(function(){
					animate.nuke(data.tile, data.attacker);
				}, 5000);
			} else if (data.type === 'nukeHit'){
				game.updateTile(data);
				game.updateDefense(data);
			} else if (data.type === 'gunfire'){
				// defender tile update
				var volume = data.player === my.player || data.playerB === my.player ?
					.7 : .2;
				animate.gunfire(data.attackerTile, data.tile, volume);
				game.updateTile(data);
				if (data.rewardUnits){
					animate.upgrade(data.tile, 'troops', data.rewardUnits);
				}
			} else if (data.type === 'updateTile'){
				// attacker tile update 
				game.updateTile(data);
				game.setSumValues();
				if (data.rewardUnits){
					animate.upgrade(data.tile, 'troops', data.rewardUnits);
				}
				if (data.sfx === 'sniper0'){
					animate.upgrade(data.tile, 'culture');
				}
			}
			else if (data.type === 'democracy-units') {
				my.player === data.player && action.democracyUnits();
			}
			else if (data.type === 'food'){
				if (data.account.indexOf(my.account) > -1){
					audio.play('hup2');
				}
			}
			else if (data.type === 'upgrade'){
				// fetch updated tile defense data
				game.updateDefense(data);
				animate.upgrade(data.tile, 'shield');
			}
			else if (data.type === 'eliminated'){
				game.eliminatePlayer(data);
			}
			else if (data.type === 'endTurnCheck'){
				game.triggerNextTurn(data);
			}
			else if (data.type === 'disconnect'){
				game.eliminatePlayer(data);
			}
			
			if (data.message){
				if (data.type === 'gunfire'){
					// ? when I'm attacked?
					if (data.defender === my.account){
						// display msg?
						game.chat(data);
					}
					// lost attack
				} else {
					game.chat(data);
				}
			}
			if (data.sfx){
				audio.play(data.sfx);
			}
		}
	},
	sendWhisper: function(msg, splitter){
		// account
		var msg = msg.split(splitter),
			msg = msg[1].split(" "),
			account = msg.shift();
		console.info('sendWhisper', account, msg[0]);
		$.ajax({
			url: app.url + 'php/insertWhisper.php',
			data: {
				account: account,
				flag: my.flag,
				playerColor: my.playerColor,
				message: msg[0],
				action: 'send'
			}
		});
	},
	lastWhisper: {
		account: '',
		message: '',
		timestamp: 0
	},
	receiveWhisper: function(data){
		//console.info('receiveWhisper ', data);
		if (g.view === 'title'){
			title.chat(data);
		} else if (g.view === 'lobby'){
			lobby.chat(data);
		} else {
			game.chat(data);
		}
	},
	changeChannel: function(msg, splitter){
		var arr = msg.split(splitter);
		socket.setChannel(arr[1]);
	},
	who: function(msg){
		var a = msg.split("/who ");
		$.ajax({
			url: app.url + 'php/whoUser.php',
			data: {
				account: a[1]
			}
		}).done(function(data){
			function getRibbonStr(){
				var str = '';
				if (data.ribbons !== undefined){
					data.ribbons.reverse();
					var i = 0,
						len = data.ribbons.length,
						z;

					if (len){
						str += '<div class="ribbon-wrap">';
						for (; i<len; i++){
							z = data.ribbons[i];
							str += '<img class="pointer ribbon" data-ribbon="'+ z +'" src="images/ribbons/ribbon'+ z +'.jpg">';
						}
						str += '</div>';
					}
				}
				return str;
			}
			
			var str = 
			'<div class="who-wrap">'+
				'<div class="who-wrap-left">';
				// left col
				str += data.str;
				if (data.account !== my.account && g.friends.indexOf(data.account) === -1){
					str += '<button style="pointer-events: initial" class="addFriend btn btn-xs fwBlue" data-account="'+ data.account +'">Add Friend</button>';
				}
			str += 
				'</div>'+
				'<div class="who-wrap-right">';
				// right col
				str += getRibbonStr() +
				'</div>'+
			'</div>';
			g.chat(str);
		}).fail(function(){
			g.chat('No data found.');
		});
	},
	help: function(){
		var a = [
			'<div class="chat-warning">Chat Commands:</div>',
			'<div>#channel: join channel</div>',
			'<div>@account: whisper user</div>',
			'<div>/ignore account: ignore account</div>',
			'<div>/unignore account: stop ignoring account</div>',
			'<div>/friend account: add/remove friend</div>',
			'<div>/who account: check account info (or click account name)</div>'
		];
		a.forEach(function(v) {
			title.chat({
				message: v,
				type: 'chat-muted'
			});
		});
	},
	broadcast: function(msg){
		$.ajax({
			url: app.url + 'php/insertBroadcast.php',
			data: {
				message: msg
			}
		});
	},
	closeApp: function(){
		$.ajax({
			type: 'GET',
			url: app.url + 'php/close-app.php'
		}).done(function() {
			console.info('close-app');
		});
	},
	url: function(url){
		$.ajax({
			url: app.url + 'php/insertUrl.php',
			data: {
				url: url
			}
		});
	},
	img: function(url){
		$.ajax({
			url: app.url + 'php/insertImg.php',
			data: {
				url: url
			}
		});
	},
	video: function(url){
		$.ajax({
			url: app.url + 'php/insertVideo.php',
			data: {
				url: url
			}
		});
	},
	fwpaid: function(msg){
		$.ajax({
			url: app.url + 'php/fwpaid.php',
			data: {
				message: msg
			}
		});
	},
	addRibbon: function(account, ribbon){
		$.ajax({
			url: app.url + 'php/fw-add-ribbon.php',
			data: {
				account: account,
				ribbon: ribbon
			}
		});
	},
	sendMsg: function(bypass){
		var msg = $DOM.titleChatInput.val().trim();
		// bypass via ENTER or chat has focus
		if (bypass || title.chatOn){
			if (msg){
				// is it a command?
				if (msg === '/friend'){
					title.listFriends();
				}
				else if (msg.indexOf('/friend ') === 0){
					title.toggleFriend(msg.slice(8));
				}
				else if (msg.indexOf('/unignore ') === 0){
					var account = msg.slice(10);
					title.removeIgnore(account);
				}
				else if (msg === '/ignore'){
					title.listIgnore();
				}
				else if (msg.indexOf('/ignore ') === 0){
					var account = msg.slice(8);
					title.addIgnore(account);
				}
				else if (msg.indexOf('/join ') === 0){
					title.changeChannel(msg, '/join ');
				}
				else if (msg.indexOf('#') === 0){
					title.changeChannel(msg, '#');
				}
				else if (msg.indexOf('/j ') === 0){
					title.changeChannel(msg, '/j ');
				}
				else if (msg.indexOf('@') === 0){
					title.sendWhisper(msg , '@');
				}
				else if (msg.indexOf('/who ') === 0){
					title.who(msg);
				}
				else if (msg.indexOf('/broadcast ') === 0){
					title.broadcast(msg);
				}
				else if (msg.indexOf('/closeApp') === 0){
					title.closeApp();
				}
				else if (msg.indexOf('/url ') === 0){
					title.url(msg);
				}
				else if (msg.indexOf('/img ') === 0){
					title.img(msg);
				}
				else if (msg.indexOf('/video ') === 0){
					title.video(msg);
				}
				else if (msg.indexOf('/fw-paid ') === 0){
					var account = msg.slice(8);
					title.fwpaid(account);
				}
				else if (msg.indexOf('/fw-add-ribbon ') === 0){
					var a = msg.split(" "),
						account = a[1],
						ribbon = a[2];
					title.addRibbon(account, ribbon);
				}
				else {
					if (msg.charAt(0) === '/' && msg.indexOf('/me') !== 0 || msg === '/me'){
						// skip
					}
					else {
						$.ajax({
							url: app.url + 'php/insertTitleChat.php',
							data: {
								message: msg
							}
						});
					}
				}
			}
			$DOM.titleChatInput.val('');
		}
	},
	listFriendsThrottle: 0,
	listFriends: function(){
		if (Date.now() - title.listFriendsThrottle < 5000) return;
		title.listFriendsThrottle = Date.now();
		var len = g.friends.length;
		g.chat('<div>Checking friends list...</div>');
		if (g.friends.length){
			$.ajax({
				url: app.url + 'php/friendStatus.php',
				data: {
					friends: g.friends
				}
			}).done(function(data){
				var str = '<div>Friend List ('+ len +')</div>';
				g.chat(str);
				for (var i=0; i<len; i++){
					var str = '',
						index = data.players.indexOf(g.friends[i]);
					if (index > -1){
						// online
						str += '<div><span class="chat-online titlePlayerAccount">' + g.friends[i] + '</span>';
						if (typeof data.locations[index] === 'number'){
							str += ' playing in game: ' + data.locations[index];
						} else {
							str += ' in chat channel: ';
							if (g.view === 'title'){
								// enable clicking to change channel
								str += '<span class="chat-online chat-join">' + data.locations[index] + '</span>';
							} else {
								// not in a game ?
								str += data.locations[index];
							}
						}
						console.info("ONLINE: ", str);
						str += '</div>';
						g.chat(str);
					} else {
						// offline
						console.info("OFFLINE: ");
						g.chat('<div><span class="chat-muted titlePlayerAccount">' + g.friends[i] +'</span></div>');
					}
				}
			});
		} else {
			g.chat("<div>You don't have any friends! Use /friend account to add a new friend.</div>", 'chat-muted');
		}
		$("#title-chat-input").focus();
	},
	showBackdrop: function(e){
		TweenMax.to('#titleViewBackdrop', .3, {
			startAt: {
				visibility: 'visible',
				alpha: 0
			},
			alpha: 1,
			onComplete: function(){
				if (e !== undefined){
					e.focus();
				}
			}
		});
		g.isModalOpen = true;
		var filter = {
			blur: 0
		};
		TweenMax.to(filter, .3, {
			blur: 3,
			onUpdate: function() {
				animate.blur('#mainWrap, #gameWrap', filter.blur);
			}
		});
	},
	toggleModal: function() {
		if (g.isModalOpen) {
			title.closeModal();
		}
		else {
			title.showModal();
		}
	},
	showModal: function() {
		TweenMax.to("#optionsModal", g.modalSpeed, {
			startAt: {
				visibility: 'visible',
				y: 0,
				alpha: 0
			},
			y: 30,
			alpha: 1
		});
		title.showBackdrop();
		var filter = {
			blur: 0
		};
		TweenMax.to(filter, .3, {
			blur: 3,
			onUpdate: function() {
				animate.blur('#mainWrap, #gameWrap', filter.blur);
			}
		});
	},
	closeModal: function(){
		audio.play('click');
		TweenMax.set('.title-modals, #titleViewBackdrop', {
			alpha: 0,
			visibility: 'hidden'
		});
		g.isModalOpen = false;
		var filter = {
			blur: 3
		};
		TweenMax.to(filter, .3, {
			blur: 0,
			onUpdate: function() {
				animate.blur('#mainWrap, #gameWrap', filter.blur);
			}
		});
	},
	exitGame: function() {
		// exit from app
		title.closeGame();
		nw.App.closeAllWindows();
	},
	closeGame: function() {
		if (app.isApp) {
			var gui = require('nw.gui');
			// do things I should do before leaving the game
			my.account && socket.removePlayer(my.account);
			if (g.view === 'lobby') {
				exitGame();
			}
			else if (g.view === 'game') {
				surrender();
			}
		}
	},
	addCpu: 0,
	createGameFocus: false,
	createGame: function(){
		var name = $("#gameName").val(),
			pw = $("#gamePassword").val(),
			max = $("#gamePlayers").val() * 1,
			speed = g.speed;
			
		if (!g.rankedMode && (name.length < 4 || name.length > 32)){
			g.msg(lang[my.lang].badGameName, 1);
			setTimeout(function(){
				$("#gameName").focus().select();
			}, 100);
		} else if (!g.rankedMode && (max < 2 || max > 8 || max % 1 !== 0)){
			g.msg(lang[my.lang].notEnoughPlayers, 1);
		} else {
			title.createGameService(
				name,
				pw,
				title.mapData[g.map.key].name,
				max,
				g.rankedMode,
				g.teamMode,
				speed
			);
		}
	},
	openWindow: function(href) {
		if (app.isApp) {
			/*var gui = require('nw.gui'),
				win = gui.Window.open(href, {
					position: 'center',
					width: 1280,
					height: 720
				});*/
		}
	},
	configureNation: function() {
		TweenMax.to('#configureNation', g.modalSpeed, {
			startAt: {
				visibility: 'visible',
				y: 0,
				alpha: 0
			},
			y: 30,
			alpha: 1
		});
		title.showBackdrop();
	},
	createGameService: function(name, pw, map, max, rankedMode, teamMode, speed){
		g.lock(1);
		audio.play('click');
		g.rankedMode = rankedMode;
		g.teamMode = teamMode;
		// g.speed = speed;
		$.ajax({
			url: app.url + 'php/createGame.php',
			data: {
				name: name,
				pw: pw,
				map: map,
				max: max,
				rating: rankedMode,
				teamMode: teamMode,
				speed: speed
			}
		}).done(function(data) {
			socket.removePlayer(my.account);
			my.player = data.player;
			my.playerColor = data.playerColor;
			my.team = data.team;
			game.id = data.gameId;
			game.name = data.gameName;
			// console.info("Creating: ", data);
			lobby.init(data);
			lobby.join(); // create
			socket.joinGame();
			lobby.styleStartGame();
		}).fail(function(e){
			g.msg(e.statusText);
			g.unlock(1);
		});
	},
	joinGame: function(){
		g.name = $("#joinGame").val();
		if (!g.name){
			g.msg(lang[my.lang].gameNameNotValid, 1.5);
			$("#joinGame").focus().select();
			return;
		}
		g.password = $("#joinGamePassword").val();
		g.lock();
		audio.play('click');
		$.ajax({
			url: app.url + 'php/joinGame.php',
			data: {
				name: g.name,
				password: g.password
			}
		}).done(function(data){
			title.joinGameCallback(data);
		}).fail(function(data){
			console.info(data);
			g.msg(data.statusText, 1.5);
		}).always(function(){
			g.unlock();
		});
	},
	joinGameCallback: function(data){
		socket.removePlayer(my.account);
		// console.info(data);
		my.player = data.player;
		my.playerColor = data.player;
		g.teamMode = data.teamMode;
		g.rankedMode = data.rankedMode;
		my.team = data.team;
		game.id = data.id;
		game.name = data.gameName;
		g.map = data.mapData;
		// g.speed = data.speed;
		console.info('joinGameCallback', data);
		lobby.init(data);
		lobby.join(); // normal join
		//$("#titleMenu, #titleChat").remove();
		socket.joinGame();
	},
	submitNationName: function(){
		var x = $("#updateNationName").val();
		g.lock();
		audio.play('click');
		$.ajax({
			url: app.url + 'php/updateNationName.php',
			data: {
				name: x
			}
		}).done(function(name) {
			g.msg(lang[my.lang].newNationName + name);
			$("#updateNationName").val(name);
		}).fail(function(e){
			g.msg(e.statusText);
		}).always(function(){
			g.unlock();
		});
	}
};
(function(){
	var str = '';
	for (var key in title.mapData){
		str += "<li><a class='mapSelect' href='#'>" + title.mapData[key].name + "</a></li>";
	}
	var e1 = document.getElementById('mapDropdown');
	if (e1 !== null){
		e1.innerHTML = str;
	}
	if (isLoggedIn){
		$('[title]').tooltip({
			animation: false
		});
	}
})();