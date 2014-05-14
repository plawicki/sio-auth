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
        failureRedirect: '/login'
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
        socket.set('room',data);
        socket.emit('history', history[data]);
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
