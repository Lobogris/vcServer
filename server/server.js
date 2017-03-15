var express = require('express'),
    expressApp = express(),
    sock = require('socket.io'),
    http = require('http'),
    server = http.createServer(expressApp),
    uuid = require('node-uuid'),
    rooms = {},
    userIds = {};

expressApp.use(express.static(__dirname + '/../public/dist/'));

exports.run = function (config) {

    server.listen(config.PORT);
    console.log('Escuchando en el puerto ', config.PORT);
    var log = {log: true};
    sock.listen(server, log)
        .on('connection', function (socket) {

            var currentRoom, id;

            socket.on('init', function (data, fn) {
                currentRoom = (data || {}).room || uuid.v4();
                var room = rooms[currentRoom];
                if (!data) {
                    rooms[currentRoom] = [socket];
                    id = userIds[currentRoom] = 0;
                    fn(currentRoom, id);
                    console.log('Sala creada #', currentRoom);
                } else {
                    if (!room) {
                        return;
                    }
                    userIds[currentRoom] += 1;
                    id = userIds[currentRoom];
                    fn(currentRoom, id);
                    room.forEach(function (s) {
                        s.emit('peerConnected', { id: id });
                    });
                    room[id] = socket;
                    console.log('Par conectado a la sala', currentRoom, 'con #', id);
                }
            });

            socket.on('msg', function (data) {
                var to = parseInt(data.to, 10);
                if (rooms[currentRoom] && rooms[currentRoom][to]) {
                    console.log('Redireccionando mensaje a ', to, 'por ', data.by);
                    rooms[currentRoom][to].emit('msg', data);
                } else {
                    console.warn('Usuario no valido.');
                }
            });

            socket.on('disconnect', function () {
                if (!currentRoom || !rooms[currentRoom]) {
                    return;
                }
                delete rooms[currentRoom][rooms[currentRoom].indexOf(socket)];
                rooms[currentRoom].forEach(function (socket) {
                    if (socket) {
                        socket.emit('peerDisconnected', { id: id });
                    }
                });
            });
        });
};