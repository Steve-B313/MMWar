//wss://project-one-mmwar.herokuapp.com:443/socket.io/?EIO=4&transport=websocket
//Access the functionality that socket.io provides & if we dont have a port set, use the given port
var io = require('socket.io')(process.env.PORT || 8080);

//The id of the player represented as a Hex number
var shortid = require('shortid');

console.log('heroku server started');

//The list of all the players on the server
var players = [];

//The current match id
var thisMatchId = 0;

//The current match room
var match;

//The list of currently played games
var matches = [];

//This counter is used to determine if the player is the first or the second
var counter = 0;

//Callback for the 1st connection
io.on('connection', function (socket) {

    var thisPlayerId = shortid.generate();
    var player = {
        id: thisPlayerId
    };
    players[thisPlayerId] = player;
    
    //You are the first player, create the match
    if (counter == 0) {
        thisMatchId = shortid.generate();
        match = thisMatchId.toString();
        matches[thisMatchId] = match;
    } 
    socket.room = match;
    socket.join(match);
    
    console.log('client connected, id: ', thisPlayerId);
    console.log('match id: ', match);
    console.log('=========================');
    
    //Tell the current player that he regestered succesfully to the server
    socket.emit('register', { id: thisPlayerId, match: thisMatchId, camp: counter });
    //You are the second player, echo the start command
    if (counter != 0) {
        io.in(socket.room).emit('ready', { match: thisMatchId });
    }
    counter++;
    counter = counter % 2;
    
    //Broadcast to both players the attack
    socket.on('attack', function (data) {
        console.log('attack ', JSON.stringify(data));
        socket.broadcast.to(socket.room).emit('attack', data);
    });
    //socket.broadcast.to(match).emit('registered', { id: thisPlayerId });
    
    //Ask all the players to give me there current position so i can spawn them when I connect
//    socket.broadcast.emit('requestPosition');
    
    //To spawn all the players on the server
//    for(var playerId in players) {
//                
//        if(playerId == thisPlayerId)
//            continue;
//        
//        socket.emit('spawn', players[playerId]);
//        console.log('sending spwan to new player for id: ', playerId);
//    };
//    
    //Nested callback for moving after the conenction was made, data are the position
//    socket.on('move', function (data) {
//        console.log('client moved', JSON.stringify(data));
//        data.id = thisPlayerId;        
//        
        //Telling all the clients that we moved
//        socket.broadcast.emit('move', data);
//    });
//    
    //Tell every other player about our position
//    socket.on('updatePosition', function (data) {
//        console.log('updated position: ', data);
//        data.id = thisPlayerId;
//        
        //Tell 
//        socket.broadcast.emit('updatePosition', data);
//    });
//    
//    socket.on('attack', function (data) {
//        console.log('attack request: ', data);
//        data.id = thisPlayerId;
//        
        //io is the instece of the server not the current socket, this means broadcast to everybody including the original sender
//        io.emit('attack', data);
//    });

    //To delete the disconnected player from the server
    socket.on('disconnect', function () {
        console.log('removing client: ' + thisPlayerId);
        //To remove the player and the match from the server list
        delete players[thisPlayerId];
        //To tell all the clients to delete the players character from the scene
        socket.broadcast.to(socket.room).emit('disconnected', { id: thisPlayerId });
        // leave the current room
		socket.leave(socket.room);

    });
});

setInterval(function(){
        io.emit('update');
    }, 4000);
