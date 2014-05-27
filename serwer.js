var http = require('http');
var routes = require('./routes');
var express = require('express');
var app = express();
var connect = require('connect');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var socketIo = require('socket.io');
var passportSocketIo = require('passport.socketio');
var sessionStore = new connect.session.MemoryStore();

var sessionSecret = 'wielkiSekret44';
var sessionKey = 'connect.sid';
var server;
var sio;
// redis setup
var redis = require("redis");
var rclient = redis.createClient();

// roomchaty i wpisy
var history = {"roomGlobal": []};
var rooms = [{id: "roomGlobal", name: "Global"}];

// Konfiguracja passport.js
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});

passport.use(new LocalStrategy(
    function (username, password, done) {
        if ((username === 'admin') && (password === 'tajne')) {
            console.log("Udane logowanie...");
            return done(null, {
                username: username,
                password: password
            });
        } else {
            return done(null, false);
        }
    }
));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.cookieParser());
app.use(express.urlencoded());
app.use(express.session({
    store: sessionStore,
    key: sessionKey,
    secret: sessionSecret
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(express.static("bower_components"));



app.get('/', routes.index)

app.get('/login', routes.login);

app.post('/login',
    passport.authenticate('local', {
        failureRedirect: '/login',
    }),
    routes.authorized
);

app.get('/logout', function (req, res) {
    console.log('Wylogowanie...')
    req.logout();
    res.redirect('/login');
});

server = http.createServer(app);
sio = socketIo.listen(server);

var onAuthorizeSuccess = function (data, accept) {
    console.log('Udane połączenie z socket.io');
    accept(null, true);
};

var onAuthorizeFail = function (data, message, error, accept) {
    if (error) {
        throw new Error(message);
    }
    console.log('Nieudane połączenie z socket.io:', message);
    accept(null, false);
};

sio.set('authorization', passportSocketIo.authorize({
    passport: passport,
    cookieParser: express.cookieParser,
    key: sessionKey, // nazwa ciasteczka, w którym express/connect przechowuje identyfikator sesji
    secret: sessionSecret,
    store: sessionStore,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
}));

sio.set('log level', 2); // 3 == DEBUG, 2 == INFO, 1 == WARN, 0 == ERROR

sio.sockets.on('connection', function (socket) {

    var address = socket.handshake.address;

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    var current_date = year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

    rclient.lpush(address.address, current_date, function(){
        console.log(address.address + " logged " + current_date);
    });

    socket.join('roomGlobal');
    socket.emit('history', history.roomGlobal);
    socket.emit('rooms', rooms);
    socket.set('room','roomGlobal');

    socket.on('send msg', function (data) {
        socket.get('room', function (err, room) {
            history[room].push(data);
            sio.sockets.in(room).emit('rec msg', data);
         });
        
    });

    socket.on('changeRoom', function (data) {
        socket.get('room', function (err, room) {
            socket.leave(room);
        });

        socket.join(data);
        socket.set('room',data[0]);
        socket.emit('history', history[data[0]]);

        //adding history to db
        var roomName = null;

        for(var i=0; i<rooms.length; i++)
        {
            if(rooms[i].id === data[0])
                roomName = rooms[i].name;
        }
        rclient.lpush(address.address, data[1] + "  " + roomName, function(){
            console.log(address.address + " " + data[1]);
        });
    });
    socket.on('createRoom', function (data) {
        var newRoom = {id: "room"+rooms.length, name: data};
        history[newRoom.id] = [];
        rooms.push(newRoom);
        sio.sockets.emit('rooms', rooms);        
    });
    
});

server.listen(3000, function () {
    console.log('Serwer pod adresem http://localhost:3000/');
});
