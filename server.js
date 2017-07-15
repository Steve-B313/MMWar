//wss://project-one-mmwar.herokuapp.com:443/socket.io/?EIO=4&transport=websocket
//Access the functionality that socket.io provides & if we dont have a port set, use the given port
var io = require('socket.io')(process.env.PORT || 8080);

//The id of the player represented as a Hex number
var shortid = require('shortid');

//The postgres database
var pg = require('pg');
pg.defaults.ssl = true;

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

//Database URL
var connectionString = "postgres://srgvuycakcyozi:6f209485fdb080e2ed9f8fda6226b3e5484a29bb23e24960bfffe5d708b760d8@ec2-107-20-250-195.compute-1.amazonaws.com:5432/d8fcrmkf51oman";

//Callback for the 1st connection
io.on('connection', function (socket) {

    //Player id
    var thisPlayerId;
    
    //You are the first player, create the match
    if (counter == 0) {
        thisMatchId = shortid.generate();
        match = thisMatchId.toString();
        matches[thisMatchId] = match;
    } 
    socket.room = match;
    socket.join(match);
    
    //Tell the player that he connected and ask him for his Id
    socket.emit('register', { match: thisMatchId, camp: counter });
    //The client recieve the register callback and sends his id
	socket.on('playerId', function(playerData) {
        if (playerData.id) {//There is a previous id
            thisPlayerId = playerData.id;
            console.log('there is a previously existing id: ', playerData.id);
            pg.connect (connectionString, function(err, client) {
                if (err) {
                    return console.error(err);
                }
                console.log('connected to postgres for selecting');
                const select = {
                    text: 'SELECT * FROM user_db WHERE id = $1',
                    values: [playerData.id],
                };
                client
                    .query(select)
                    .on('row', function (row) {
                        console.log(JSON.stringify(row));
                    });
            });
        } else {
            thisPlayerId = shortid.generate();
            console.log('new id: ', thisPlayerId);
            pg.connect(connectionString, function(err, client) {
                if (err) {
                    return console.error(err);
                }
                console.log('connected to postgres for inserting');
                const insert = {
                    text: 'INSERT INTO user_db(id, name, Played, Won) VALUES($1, $2, $3, $4)',
                    values [thisPlayerId, playerData.name, playerData.Played, playerData.Won],
                };
				client
                    .query(insert)
                    .on('row', function (row) {
                        console.log(JSON.strigify(row));
                    });
			});
            socket.emit('myId', { id: thisPlayerId });
		}
        pg.end();
    });

    
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
//Update the camps of all connected players
setInterval(function(){
        io.emit('update');
    }, 4000);
