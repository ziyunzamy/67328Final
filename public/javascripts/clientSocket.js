$(function(){
	var socket = io.connect();
	var username;
	var $usernameInput = $('.usernameInput'); 
	var $currentInput = $usernameInput.focus();
	var messageForm = $('#messageForm');
	var message = $('#message');
	var chat = $('#chat');
  var chatDisplay = $('#chatDisplay');
	var login = $('#login');
	var pregame = $("#pregame");
  var sideMessagePreGame = $("#sideMessagePreGame");
  var vote = $("#vote");
	var messageBtn = $("#messageForm input");
  var voteForm = $("#voteForm");
  var vote = $("#vote");
  var continueBtn = $("#continueBtn");
  var continueSection = $("#continueSection");
  var newGameBtn = $("#newGameBtn");
  var newGame = $("#newGame");
	messageBtn.prop('disabled', true);
	$(window).keydown(function (event) {
    // Auto-focus the current input when a key is typed
    	if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      		$currentInput.focus();
    	}
    // When the client hits ENTER on their keyboard
    	if (event.which === 13) {
      		if (username) {
      		} else {
        		setUsername();
      		}
    	}
  	});
	function setUsername () {
    	username = $usernameInput.val();

    // If the username is valid
    	if (username) {
      		login.fadeOut();
      		pregame.css("display","block");
          sideMessagePreGame.css("display","block");
      		login.off('click');
      // Tell the server your username
      		socket.emit('username', username);
    	}
  	}
	socket.on('user joined', function (data) {
    	$("#numPlayers").text(data.numUsers);
    	$("#welcomePlayers").append(`<div class='well'><p>User ${data.username} joined!</p></div><br>`)
    	if(data.numUsers>3){
    		$("#start").text(`we have 
				${data.numUsers} players in the room and 
				we are ready to start!`);
    		$("#startBtn").css("display","block");
    	}

  	});
  	socket.on('I joined', function (data) {
    	$("#numPlayers").text(data.numUsers);
    	$("#welcomePlayers").append("<div class='well'><p>Welcome user "+data.username+"!</p></div><br>")
    	//magic number 3, becasue of 4-player game
      if(data.numUsers>3){
        var message = `we have 
        ${data.numUsers} players in the room and 
        we are ready to start!`
        $("#sideMessagePreGame").html("<div class='well'><p>"+message+"</p></div><br>");
    		$("#startBtn").css("display","block");
    	}
  	});
 	  socket.on('ReadyTostart', function (data) {
    	$("#sideMessagePreGame").html("<div class='well'><p>"+data.message+"</p></div><br>");
    	$("#startBtn").css("display","block");
  	});
  	$('#startBtn').click(function(){
  		$("#welcomePlayers").css("display","none");
  		$('#startBtn').css("display","none");
		  socket.emit('iAmReady');
  	});
  	socket.on("you are ready",function(data){
  		$("#welcomePlayers").css("display","none");
  		$("#readyPlayers").append("<div class='well'><p>I am ready!</p></div><br>");
  		$("#word").append(data.yourWord);
  	})
  	socket.on("user ready",function(data){
  		$("#readyPlayers").append("<div class='well'><p>User "+ data.username +" is ready!</p></div><br>")
  	})

  	socket.on('everyOneIsReady',function (data){
  		pregame.css("display","none");
      $("#sideMessagePreGame").html("<div class='well'><p>Wait for your turn to describe your word</p></div><br>");
  		chat.css("display","block");
  	})
  	socket.on('yourTurn',function(data){
  		messageBtn.prop('disabled', false);
      $("#sideMessagePreGame").html("<div class='well'><p>It is your turn to describe your word</p></div><br>");
  	})
	socket.on('new message',function (data){
  		chatDisplay.append("<div class='well'>"+data.msg+"</div>");
  	})
  messageForm.submit(function(e){
		e.preventDefault();
    messageBtn.prop('disabled', true);
		socket.emit('send message',{ msg: message.val() });
    $("#sideMessagePreGame").html("<div class='well'><p>Wait for others to describe their word</p></div><br>");
	});
  socket.on('vote',function(data){
    vote.css("display","block");
    chat.css("display","none");
    $("#sideMessagePreGame").html("<div class='well'><p>Choose the one you think is the spy</p></div><br>");

    voteOptions = data;
    for(var i=0; i<voteOptions.length; i++) {
      voteForm.append(`<div class="radio">
                  <label><input type="radio" class="form-check-input" name="optradio">User ${voteOptions[i].username} says ${voteOptions[i].msg}!</label>
              </div>`);
              
    }
    voteForm.append("<input type='submit' class='btn btn-primary' value='Vote' />");
    console.log(data);
  })
  voteForm.submit(function(e){
    e.preventDefault();
    var radios = $(".form-check-input");
    var results = [];
    for (var i = 0; i < radios.length; i++) {       
        if (radios[i].checked) {
            results.push(true);
        }
        else{
            results.push(false);
        }
    }
    voteForm.html("<h1>Waiting for others to vote...</h1>");

    socket.emit("finish voting",results);
  })
  socket.on("you are spy and you are out",function(data){
      voteForm.html(`<h1>You are spy and you are out, the other ones had ${data.word}</h1>`);
      newGame.css("display","block");
  })
  socket.on("spy lost you won",function(data){
      voteForm.html(`<h1>You won! The spy is ${data.spy} and his/her word is ${data.spyword}</h1>`);
      newGame.css("display","block");
  })
  socket.on("you are spy and you won",function(data){
      voteForm.html(`<h1>You are spy and you are won, the other ones had ${data.word}</h1>`);
      newGame.css("display","block");
  })
  socket.on("spy won and you lost",function(data){
      voteForm.html(`<h1>The spy won and you lost, The spy is ${data.spy} and his word is ${data.spyword}</h1>`);
      newGame.css("display","block");
  })
  socket.on("game continues but spy is still in the game",function(data){
    voteForm.html(`<h1>Player ${data.maxVoteUser} is voted out of the game, but spy is still in the game</h1>`);
    continueSection.css("display","block");
  });
  newGameBtn.click(function(){
    location.replace("/");
  })
  continueBtn.click(function(){
    //clear vote section
    voteForm.html("");
    vote.css("display","none");
    chatDisplay.html("");
    continueSection.css("display","none");
    socket.emit("continue");
    //clear currentplayers
    //show chat
    chat.css("display","block");
    $("#sideMessagePreGame").html("<div class='well'><p>Wait for your turn to describe your word</p></div><br>");


  })
  socket.on("you are out",function(data){
    console.log(data);
    voteForm.html(`<h1>You are out of the game and the spy is still in the game</h1>`);
    $("#sideMessagePreGame").html("<div class='well'><p>opps...</p></div><br>");
    $("#sideMessagePreGame").append("<div class='well'><p>Sorry you are stuck here...until the game is over</p></div><br>");
  });
  socket.on("game is over",function(data){
    voteForm.html("");
    $("#sideMessagePreGame").html("<div class='well'><p>Game is over now, you can start a new game!</p></div><br>");
    newGame.css("display","block");
  });

})