// title.js
var title = {
	players: [],
	games: [],
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
			$("#titleChatSend").on('click', function(){
				title.sendMsg(true);
			});
			$.ajax({
				type: 'GET',
				url: 'php/initChatId.php'
			}).done(function(data){
				my.account = data.account;
				my.flag = data.flag;
				title.updatePlayers();
			});
			// init game refresh
			if (typeof Notification === 'function'){
				Notification.requestPermission();
			}
			// initial refresh of games
			$.ajax({
				type: 'GET',
				url: 'php/refreshGames.php'
			}).done(function(data) {
				var e = document.getElementById('gameTableBody');
				if (e === null){
					return;
				}
				// head
				var str = '';
				// body
				for (var i=0, len=data.length; i<len; i++){
					var d = data[i];
					title.games[d.id] = d.players * 1;
					var mode = d.teamMode ? 'Team' : 'FFA';
					str += 
					"<tr id='game_"+ d.id +"' class='wars wars-"+ mode +" no-select' data-name='" + d.name + "'>\
						<td class='warCells'>"+ d.name + "</td>\
						<td class='warCells'>" + d.map + "</td>\
						<td class='warCells'>" + d.speed + "</td>\
						<td class='warCells'>" + mode + "</td>\
					</tr>";
					
				}
				e.innerHTML = str;
				$(".wars").filter(":first").trigger("click");
			}).fail(function(e){
				console.info(e.responseText);
				//Msg("Server error.");
			});
			setTimeout(function(){
				g.keepAlive();
			}, 300000);
		});
	})(),
	updatePlayers: function(once){
		title.titleUpdate = $("#titleChatPlayers").length; // player is logged in
		if (title.titleUpdate){
			// title chat loop
			(function repeat(){
				if (g.view === 'title'){
					var start = Date.now();
					$.ajax({
						type: "POST",
						url: "php/titleUpdate.php",
						data: {
							channel: my.channel
						}
					}).done(function(data){
						// report chat messages
						console.log("Ping: ", Date.now() - start);
						// set title players
						if (data.playerData !== undefined){
							var p = data.playerData,
								foundPlayers = [];
							for (var i=0, len=p.length; i<len; i++){
								// add new players
								var account = p[i].account,
									flag = p[i].flag;
								if (title.players[account] === undefined){
									// console.info("ADDING PLAYER: " + account);
									title.addPlayer(account, flag);
								} else if (title.players[account].flag !== flag){
									// replace player flag
									var flagElement = document.getElementById("titlePlayerFlag_" + account);
									if (flagElement !== null){
										console.info(flag);
										var flagClass = flag.split(".");
										flagElement.className = 'flag ' + flagClass[0].replace(/ /g, "-");
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
						if (g.view === 'title'){
							document.getElementById('titleChatHeaderCount').textContent = len;
						}
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
								// console.info("REMOVING: ", o);
								title.removeGame(o);
							} else {
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
					}).always(function(){
						if (!once){
							setTimeout(repeat, 5000);
						}
					});
				}
			})();
		} else {
			// not logged in
			$("#titleChat, #titleMenu").remove();
		}
	},
	// adds player to chat room
	addPlayer: function(account, flag){
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
		var flagClass = flag.split(".");
		flagClass = flagClass[0].replace(/ /g, "-");
		e.innerHTML = '<div id="titlePlayerFlag_'+ account +'" class="flag ' + flagClass +'"></div><span class="titlePlayerAccount">'+ account +'</span>';
		if (title.titleUpdate){
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
		// console.info("addToGame", data);
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
		// console.info("removeFromGame", data);
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
			mode = data.teamMode ? 'Team' : 'FFA';
		e.id = 'game_' + data.id;
		e.className = 'wars wars-'+ mode +' no-select';
		e.setAttribute('data-name', data.name);
		e.innerHTML = 
			"<td class='warCells'>"+ data.name + "</td>\
			<td class='warCells'>" + data.map + "</td>\
			<td class='warCells'>" + data.speed + "</td>\
			<td class='warCells'>" + mode + "</td>";
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
		EarthAlpha: {
			name: 'Earth Alpha',
			tiles: 83,
			players: 8
		},
		FlatEarth: {
			name: 'Flat Earth',
			tiles: 78,
			players: 8
		},
		UnitedStates: {
			name: 'United States',
			tiles: 48,
			players: 4
		},
		France: {
			name: 'France',
			tiles: 81,
			players: 8
		}
	},
	chatDrag: false,
	chatOn: false,
	chat: function (data){
		if (g.view === 'title' && data.message){
			while (DOM.titleChatLog.childNodes.length > 500) {
				DOM.titleChatLog.removeChild(DOM.titleChatLog.firstChild);
			}
			var z = document.createElement('div'); 
			if (data.type){
				z.className = data.type;
			}
			z.innerHTML = data.message;
			DOM.titleChatLog.appendChild(z);
			if (!title.chatDrag){
				DOM.titleChatLog.scrollTop = DOM.titleChatLog.scrollHeight;
			}
			if (!data.skip){
				g.sendNotification(data);
			}
		}
	},
	listFriends: function(){
		var len = g.friends.length;
		g.chat('<div>Checking friends list...</div>');
		if (len){
			$.ajax({
				url: 'php/getFriends.php',
				data: {
					friends: g.friends
				}
			}).done(function(data){
				console.info(data);
				var str = '<div>Friend List ('+ len +')</div>';
				for (var i=0; i<len; i++){
					if (g.friends.indexOf(data.players[i]) > -1){
						// online
						str += '<div><span class="chat-online titlePlayerAccount">' + g.friends[i] + '</span>';
						console.info(data.players[i], data.locations[i], typeof data.locations[i]);
						if (typeof data.locations[i] === 'number'){
							str += ' playing in game: ' + data.locations[i];
						} else {
							str += ' in chat channel: ';
							if (g.view === 'title'){
								// enable clicking to change channel
								str += '<span class="chat-online chat-join">' + data.locations[i] + '</span>';
							} else {
								// not in a game
								str += data.locations[i];
							}
						}
						
						str += '</div>';
					} else {
						str += '<div><span class="chat-muted titlePlayerAccount">' + g.friends[i] +'</span></div>';
					}
				}
				g.chat(str);
			});
		} else {
			if (fwpaid){
				g.chat("You don't have any friends!<img src='images/chat/random/feelsbad.png'>", 'chat-muted');
			} else {
				g.chat("This is a paid feature. Unlock the complete game to check your friend's status.", 'chat-muted');
			}
		}
	},
	addFriend: function(account){
		account = account.trim();
		g.chat('<div>Adding friend: '+ account +'</div>');
		if (g.friends.indexOf(account) === -1 && account){
			if (g.friends.length < 20){
				if (account !== my.account){
					g.friends.push(account);
					localStorage.setItem('friends', JSON.stringify(g.friends));
					g.chat('Added friend: ' + account, 'chat-muted');
				} else {
					g.chat("<img src='images/chat/random/hangfrog.jpg'><div>You can't be friends with yourself!</div>", 'chat-muted');
				}
			} else {
				// add image
				g.chat('You cannot have more than 20 friends!', 'chat-muted');
			}
		} else {
			g.chat('You are already friends with ' + account +'!<img src="images/chat/random/forget.jpg">', 'chat-muted');
		}
	},
	removeFriend: function(account){
		account = account.trim();
		g.chat('<div>Removing friend: '+ account +'</div>');
		if (g.friends.indexOf(account) > -1 && account){
			// found account
			var index = g.friends.indexOf(account);
			g.friends.splice(index, 1);
			localStorage.setItem('friends', JSON.stringify(g.friends));
			g.chat('Removed friend: ' + account, 'chat-muted');
		} else {
			g.chat('That account is not on your friend list.', 'chat-muted');
		}
	},
	listIgnore: function(){
		var len = g.ignore.length;
		var str = '<div>Ignore List ('+ len +')</div>';
		for (var i=0; i<len; i++){
			str += '<div><span class="chat-muted titlePlayerAccount">' + g.ignore[i] +'</span></div>';
		}
		g.chat(str);
	},
	addIgnore: function(account){
		account = account.trim();
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
		account = account.trim();
		g.chat('<div>Unignoring '+ account +'</div>');
		if (g.ignore.indexOf(account) > -1 && account){
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
				// console.info(data);
				title.addPlayer(data.account, data.flag);
			} else {
				if (data.message !== undefined){
					title.chat(data);
				}
			}
		} else if (g.view === 'lobby'){
			// lobby
			// console.info('lobby receive: ', data);
			if (data.type === 'hostLeft'){
				lobby.hostLeft();
			} else if (data.type === 'government'){
				lobby.updateGovernment(data);
			} else if (data.type === 'updatePlayerColor'){
				lobby.updatePlayerColor(data);
			} else if (data.type === 'updateTeamNumber'){
				lobby.updateTeamNumber(data);
			} else if (data.type === 'countdown'){
				lobby.countdown(data);
			} else if (data.type === 'update'){
				lobby.updatePlayer(data);
			} else {
				if (data.message !== undefined){
					lobby.chat(data);
				}
			}
		} else {
			// game
			// console.info('game receive: ', data);
			if (data.type === 'cannons'){
				animate.cannons(data.attackerTile, data.tile, false);
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
				animate.gunfire(data.attackerTile, data.tile, data.player === my.player);
				game.updateTile(data);
			} else if (data.type === 'updateTile'){
				// attacker tile update
				game.updateTile(data);
			} else if (data.type === 'food'){
				if (data.account.indexOf(my.account) > -1){
					audio.play('food');
				}
			} else if (data.type === 'upgrade'){
				// fetch updated tile defense data
				game.updateDefense(data);
				animate.upgrade(data.tile);
			} else if (data.type === 'eliminated'){
				game.eliminatePlayer(data);
			} else if (data.type === 'disconnect'){
				game.eliminatePlayer(data);
			}
			
			if (data.message){
				if (data.type === 'gunfire'){
					// ? when I'm attacked?
					if (data.defender === my.account){
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
		var arr = msg.split(splitter);
		var account = arr[1].split(" ").shift();
		// message
		var splitLen = splitter.length;
		var accountLen = account.length;
		var msg = msg.substr(splitLen + accountLen + 1);
		var flag = my.flag.split(".");
		flag = flag[0].replace(/ /g, "-");
		$.ajax({
			url: 'php/insertWhisper.php',
			data: {
				account: account,
				flag: flag,
				playerColor: my.playerColor,
				message: msg,
				action: 'send'
			}
		});
	},
	receiveWhisper: function(data){
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
			url: 'php/whoUser.php',
			data: {
				account: a[1]
			}
		}).done(function(data){
			g.chat(data);
		});
	},
	help: function(){
		var str = 
			'<div class="chat-warning">Chat Commands:</div>\
			<div>/j: change channel</div>\
			<div>/join: change channel</div>\
			<div>/w account: whisper user</div>\
			<div>/whisper account: whisper user</div>\
			<div>@account_name: whisper user</div>\
			<div>/ignore: show ignore list</div>\
			<div>/ignore account: ignore account</div>\
			<div>/unignore account: stop ignoring account</div>\
			<div>/friend: show friend list</div>\
			<div>/friend account: add friend</div>\
			<div>/unfriend account: remove friend</div>\
			<div>/who account: check account info</div>\
			';
		var o = {
			msg: str,
			type: 'chat-muted'
		};
		title.chat(o);
	},
	broadcast: function(msg){
					$.ajax({
						url: 'php/insertBroadcast.php',
						data: {
							message: msg
						}
					});
	},
	sendMsg: function(bypass){
		var msg = $DOM.titleChatInput.val().trim();
		// bypass via ENTER or chat has focus
		if (bypass || title.chatOn){
			if (msg){
				// is it a command?
				if (msg.indexOf('/unfriend ') === 0){
					var account = msg.slice(10);
					title.removeFriend(account);
				} else if (msg === '/friend'){
					title.listFriends();
				} else if (msg.indexOf('/friend ') === 0){
					var account = msg.slice(8);
					title.addFriend(account);
				} else if (msg.indexOf('/unignore ') === 0){
					var account = msg.slice(10);
					title.removeIgnore(account);
				} else if (msg === '/ignore'){
					title.listIgnore();
				} else if (msg.indexOf('/ignore ') === 0){
					var account = msg.slice(8);
					title.addIgnore(account);
				} else if (msg.indexOf('/help') === 0){
					title.help();
				} else if (msg.indexOf('/join ') === 0){
					title.changeChannel(msg, '/join ');
				} else if (msg.indexOf('/j ') === 0){
					title.changeChannel(msg, '/j ');
				} else if (msg.indexOf('/whisper ') === 0){
					title.sendWhisper(msg , '/whisper ');
				} else if (msg.indexOf('/w ') === 0){
					title.sendWhisper(msg , '/w ');
				} else if (msg.indexOf('@') === 0){
					title.sendWhisper(msg , '@');
				} else if (msg.indexOf('/who ') === 0){
					title.who(msg);
				} else if (msg.indexOf('/broadcast ') === 0){
					title.broadcast(msg);
				} else {
					$.ajax({
						url: 'php/insertTitleChat.php',
						data: {
							message: msg
						}
					});
				}
			}
			$DOM.titleChatInput.val('');
		}
	},
	showBackdrop: function(e){
		TweenMax.to(document.getElementById("titleViewBackdrop"), .3, {
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
	},
	closeModal: function(){
		var e1 = document.getElementById("configureNation"),
			e2 = document.getElementById("titleViewBackdrop"),
			e3 = document.getElementById('createGameWrap'),
			e4 = document.getElementById('optionsModal'),
			e5 = document.getElementById('leaderboard'),
			e6 = document.getElementById('unlockGame');
		TweenMax.to([e1,e2,e3,e4,e5,e6], .2, {
			alpha: 0,
			onComplete: function(){
				TweenMax.set(this.target, {
					visibility: 'hidden'
				});
			}
		});
		g.isModalOpen = false;
	},
	createGameFocus: false,
	createGame: function(){
		var name = $("#gameName").val(),
			pw = $("#gamePassword").val(),
			max = $("#gamePlayers").val() * 1,
			speed = $("#createGameSpeed").text();
		if (!g.rankedMode && (name.length < 4 || name.length > 32)){
			Msg("Game name must be at least 4-32 characters.", 1);
			setTimeout(function(){
				$("#gameName").focus().select();
			}, 100);
		} else if (!g.rankedMode && (max < 2 || max > 8 || max % 1 !== 0)){
			Msg("Game must have 2-8 players.", 1);
		} else {
			g.lock(1);
			audio.play('click');
			$.ajax({
				url: 'php/createGame.php',
				data: {
					name: name,
					pw: pw,
					map: title.mapData[g.map.key].name,
					max: max,
					rating: g.rankedMode,
					teamMode: g.teamMode,
					speed: speed
				}
			}).done(function(data) {
				// console.info(data);
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
				console.info(e.responseText);
				Msg(e.statusText);
				g.unlock(1);
			});
		}
	},
	joinGame: function(){
		g.name = $("#joinGameName").val();
		if (!g.name){
			Msg("Game name is not valid!", 1.5);
			return;
		}
		g.password = $("#joinGamePassword").val();
		g.lock();
		audio.play('click');
		$.ajax({
			url: 'php/joinGame.php',
			data: {
				name: g.name,
				password: g.password
			}
		}).done(function(data){
			title.joinGameCallback(data);
		}).fail(function(data){
			console.info(data);
			Msg(data.statusText, 1.5);
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
		g.speed = g.speeds[data.speed];
		lobby.init(data);
		lobby.join(); // normal join
		socket.joinGame();
	},
	submitNationName: function(){
		var x = $("#updateNationName").val();
		g.lock();
		audio.play('click');
		$.ajax({
			url: 'php/updateNationName.php',
			data: {
				name: x
			}
		}).done(function(data) {
			$(".configureNationName").text(data);
			// animate.nationName();
		}).fail(function(e){
			Msg(e.statusText);
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
	$('[title]').tooltip();
	setTimeout(function(){
		animate.logo(Linear.easeNone);
	}, 250);
})();