  exports.init = function(io) {
	var currentPlayers = [];
	var outPlayers = []; // keep track of the number of players
	var words = [{"word1":"pen","word2":"pencil"},
	{"word1":"chair","word2":"sofa"},
	{"word1":"computer","word2":"laptop"},
	{"word1":"fly","word2":"flight"}]
	/**
 * Returns a random integer between min (inclusive) and max (inclusive)
 * Using Math.round() will give you a non-uniform distribution!
 */
	function getRandomInt(min, max) {
    	return Math.floor(Math.random() * (max - min + 1)) + min;
	}

  // When a new connection is initiated
	io.sockets.on('connection', function (socket) {
		if(currentPlayers.length>=4){
			socket.emit('roomIsFull',{msg:`we already have 4 players in room, room is full`})
		}
		var addedUser = false;
		socket.on('username',function(username){
			if (addedUser) return;
			currentPlayers.push(socket);
			socket.username = username;
			socket.ready = false;
			addedUser = true;
			socket.emit('I joined', {
      			username: socket.username,
      			numUsers: currentPlayers.length
    		});
			socket.broadcast.emit('user joined', {
      			username: socket.username,
      			numUsers: currentPlayers.length
    		});
    		//able to start game, set the words for players
    		if(currentPlayers.length==4){
				var index = getRandomInt(0,words.length-1);
				var wordCombo = words[index];
				//pick a spy in currentPlayers
				var spy = getRandomInt(0, currentPlayers.length-1);
				for (i = 0; i < currentPlayers.length; i++) { 
					if(i==spy){
						currentPlayers[i].word = wordCombo.word1
						currentPlayers[i].spy = true;
						currentPlayers[i].otherWord = wordCombo.word2;
					}else{
						currentPlayers[i].word = wordCombo.word2
						currentPlayers[i].spy = false;
						currentPlayers[i].otherWord = wordCombo.word1;
					}
					console.log(currentPlayers[i].word);
					console.log(currentPlayers[i].isSpy);

				}
			socket.broadcast.emit('ReadyTostart', { message: `we have 
				${currentPlayers.length} players in the room and 
				we are ready to start!`});
		}
		})
		socket.on('iAmReady',function(){
			socket.ready = true;
			socket.emit('you are ready', {
      			yourWord: socket.word
    		});
			socket.broadcast.emit('user ready', {
      			username: socket.username
    		});
    		//check and see if everyone is ready
    		var everyOneIsReady = true;
			for (i = 0; i < currentPlayers.length; i++){
				everyOneIsReady = everyOneIsReady && currentPlayers[i].ready
			}
			if(everyOneIsReady){
				for (i = 0; i < currentPlayers.length; i++){
					currentPlayers[i].emit("everyOneIsReady");
				}
				currentPlayers[0].emit("yourTurn");
			}
		});
		socket.on('continue',function(){
			socket.ready = true;
			var everyOneIsReady = true;
			for (i = 0; i < currentPlayers.length; i++){
				everyOneIsReady = everyOneIsReady && currentPlayers[i].ready;
			}
			if(everyOneIsReady){
				for (i = 0; i < currentPlayers.length; i++){
					currentPlayers[i].emit("everyOneIsReady");
				}
				currentPlayers[0].emit("yourTurn");
			}
		});
		socket.on('send message',function(data){
			io.sockets.emit("new message",{msg:data.msg});
			socket.msg = data.msg;
			var turn = currentPlayers.indexOf(socket);
			console.log(turn);
			console.log(currentPlayers.length-1);
			if(turn == currentPlayers.length-1){
				result = []
				for (i = 0; i < currentPlayers.length; i++){
					result.push({"username":currentPlayers[i].username,
									"msg":currentPlayers[i].msg})
				}
				for(i=0;i<currentPlayers.length;i++){
					currentPlayers[i].vote = [];
				}
				console.log(result);
				for (i = 0; i < currentPlayers.length; i++){
					currentPlayers[i].emit("vote",result);
				}
			}
			else{currentPlayers[turn+1].emit("yourTurn");}
		});
		socket.on('finish voting', function(data){
			for(i=0;i<data.length;i++){
				if(data[i]){
					currentPlayers[i].vote.push(true);
				}
				else{
					currentPlayers[i].vote.push(false);
				}
			}
			//everyone voted
			//magic number 4 becasue its a 4-player room
			//4 votes means everyone voted
			if(currentPlayers[0].vote.length == currentPlayers.length){
				var maxVote = 0;
				var maxVoteUser = 0;
				for(var i=0;i<currentPlayers.length;i++){
					var totalVote = 0

					for(var j=0;j<currentPlayers[i].vote.length;j++){
						if (currentPlayers[i].vote[j]){
							totalVote++
						}
					}
					currentPlayers[i].vote = totalVote;
					if(totalVote>maxVote){
						maxVote=totalVote;
						maxVoteUser=i;
					}
				}
				console.log(maxVoteUser);
				console.log(currentPlayers[maxVoteUser].spy);
				console.log(currentPlayers[maxVoteUser].word);
				console.log(currentPlayers[maxVoteUser].vote);
				//game is over and spy loses
				if(currentPlayers[maxVoteUser].spy){
					for(i=0;i<currentPlayers.length;i++){
						if(currentPlayers[i].spy){
							//tell spy he loses
							currentPlayers[i].emit("you are spy and you are out",
								{"word":currentPlayers[i].otherWord});
						}
						else{
							//tell everyone else they win
							currentPlayers[i].emit("spy lost you won",
								{"spy":currentPlayers[maxVoteUser].username,
								"spyword":currentPlayers[i].otherWord});
							//add points to everyone else
						}
					}
					for(j=0;j<outPlayers.length;j++){
						outPlayers[j].emit("game is over");
					}
				}
				else{
					//game is over and spy wins
					if(currentPlayers.length==3){
						for(i=0;i<currentPlayers.length;i++){
							if(currentPlayers[i].spy){
								//tell spy he wins
								currentPlayers[i].emit("you are spy and you won",
								{"word":currentPlayers[i].otherWord});
								//add points to spy
							}
							else{
								//tell everyone else they loses
								currentPlayers[i].emit("spy won and you lost",
								{"spy":currentPlayers[maxVoteUser].username,
								"spyword":currentPlayers[i].otherWord});
							}
						}
						for(j=0;j<outPlayers.length;j++){
							outPlayers[j].emit("game is over");
						}
					}
					else{
						//game continues
						for(i=0;i<currentPlayers.length;i++){
							if(i==maxVoteUser){
								//tell the person he's out of the game
								currentPlayers[i].emit("you are out",
									{"spy":currentPlayers[i].spy,
									"otherWord":currentPlayers[i].otherWord});
							}
							else{
								//tell everyone else game continues
								currentPlayers[i].emit("game continues but spy is still in the game",
								{"maxVoteUser":currentPlayers[maxVoteUser].username,
								"maxVote":maxVote});
							}
						}
						outPlayers.push(currentPlayers.splice(maxVoteUser,1)[0]);
						//clear user data
						for(i=0;i<currentPlayers.length;i++){
							currentPlayers[i].ready = false;
							currentPlayers[i].msg = "";
							currentPlayers[i].vote = [];
						}
					}
				}
		}
		});
		
		/*
		 * Emit players events also to all (i.e. broadcast) other connected sockets.
		 * Broadcast is not emitted back to the current (i.e. "this") connection
         */
		socket.broadcast.emit('players', { number: currentPlayers.length});

		/*
		 * Upon this connection disconnecting (sending a disconnect event)
		 * decrement the number of players and emit an event to all other
		 * sockets.  Notice it would be nonsensical to emit the event back to the
		 * disconnected socket.
		 */
		socket.on('disconnect', function () {
			currentPlayers.splice(currentPlayers.indexOf(socket),1);
			socket.broadcast.emit('players', { number: currentPlayers.length});
		});
	});
	
}