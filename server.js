/**
 * Created by yongbum on 2016-06-02.
 */
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var gcm = require('node-gcm');


var fs = require('fs');
var socketid= {};
var allUsers= {};
var allrooms= {};
var allsocket= new Array();
allrooms.roomlist = new Array();

app.get('/chat', function(req, res){
    console.log("chat")
   res.sendFile(__dirname +'/chatclient.html');

});

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.get('/push', function(req, res){
    console.log(req.url)
    console.log(req.param('token',null))
    var token = req.param('token',null);
    var childname = req.param('childname','우리아이');
    if(token){
    var message = new gcm.Message({
        collapseKey: 'demo',
        delayWhileIdle: true,
        timeToLive: 3,
        data: {
            title: '사남이녀',
            message: childname+'가 한단계 더 올라갔어요 칭찬해주세요',
            custom_key1: 'custom data1',
            custom_key2: 'custom data2'
        }
    });
    var server_api_key = 'AIzaSyBRgYjsA7II1WLYEABhVjAZ822eRANgkow';
    var sender = new gcm.Sender(server_api_key);
    var registrationIds = [];
    registrationIds.push(token);
     sender.send(message, registrationIds, 4, function (err, result) {
        console.log(result);
        if(err){res.send('fail'); res.sendStatus(404);}
        else{res.send('success');}
    });
    }else{
        console.log('쿠키가 없습니다');
    }
});


io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('disconnect', function(){


        console.log('a user disconnected');
        console.log(socketid);
        var id = socketid[socket.id];
        console.log(id);
        var user = allUsers[id];
        console.log(user.userid);
        console.log(user.room);
        console.log("나가기"+allrooms[allUsers[id].room].length);
        user.msg=user.userid+'가 방을 나갓습니다';

        for(var i = 0; i<allrooms[allUsers[id].room].length; i++){
            if(allrooms[user.room][i].userid == id){
                allrooms[user.room].splice(i,1);
            }
        }
        socketid[socket.id] = null;
        console.log("나가기"+allrooms[allUsers[id].room].length);
    });

    socket.on('login', function(data){
        var userid = data.userid;
        data.socket = socket;
        allUsers[userid] = data;
        if(allrooms[data.room]){
           allrooms[data.room].push(data);
        }else{
            allrooms[data.room] = new Array();
            allrooms.roomlist.push(data.room);
            allrooms[data.room].push(data);
        }
        allsocket.push(socket);
        allUsers[userid].socket.emit("visit",data.room)
        socketid[socket.id] = data.userid;
    });
    socket.on('rooomuserlist', function(data){
        console.log(allrooms[data.room])
        var list = allrooms[data.room]
        var userlist =  new Array();
        for(var z = 0; z<list.length; z++){
            userlist.push(list[z].userid)
        }
        socket.emit('rooomuserlist',userlist);
    });
 socket.on('message', function(data){
        var chatroom = allrooms[data.room];
        console.log(data.room)
        catroommsg(chatroom,data);
    });
    socket.on('visit', function(data){
        var chatroom = allrooms[data.room];
        console.log(data.room)

        for(var i=0; i<chatroom.length; i++){
            if(chatroom[i].userid != data.userid) {
                chatroom[i].socket.emit('roommsg', data)
            }
        }
    });
    socket.on('alluser', function(data){
        var list = allsocket;
        var userlist =  new Array();
        console.log(socketid)
        for(var z = 0; z<list.length; z++){
            if(socketid[list[z].id]){
                console.log(list[z].id)
                console.log(socketid[list[z].id])
           userlist.push( socketid[list[z].id])
            }
        }
        socket.emit('rooomuserlist',userlist);
    });
   socket.on('mkroom', function(data){
        if(allrooms[data.mkroom]){
            data.msg = '이미 작성되있는 방입니다'
            socket.emit('mkroomresult',data)
        }else{
            allrooms[data.mkroom] = new Array();
            allrooms.roomlist.push(data.mkroom);
            data.msg = data.mkroom+'방이 만들어졌습니다';
            socket.emit('mkroomresult',data)
        }

    });
    socket.on('mvroom', function(data){
        if(allrooms[data.mvroom]){
            catroommsg(allrooms[data.room],data)
            console.log("mvroom"+ allrooms[data.mvroom])
            console.log("mvroom"+ allrooms[data.mvroom].length)
           data.socket = socket;
            allrooms[data.mvroom].push(data);
            catroomuserdel(data,socket);
            data.room = data.mvroom;
            allUsers[data.userid] = data;
            socket.emit('visit',data.mvroom)
            console.log("mvroom"+ allrooms[data.mvroom])
            console.log("mvroom"+ allrooms[data.mvroom].length)
        }else{
            data.msg = data.mvroom+'방이 존재 하지않습니다';
            socket.emit('mvroomresult',data)
        }

    });
    socket.on('wismsgto', function(data){
       allUsers[data.to].socket.emit('wismsgfrom',data)
        socket.emit('wismsgfrom',data)
     });
    socket.on('allmsg', function(data){
        for(var i=0; i<allsocket.length; i++) {
            allsocket[i].emit('allmsg',data)
        }
    });
    socket.on('rooomlist', function(data){
       socket.emit('rooomlist',allrooms.roomlist);
    });
    function catroomuserdel(data,socket) {
        for(var i=0; i<allrooms[data.room].length; i++){
            if(allrooms[data.room][i].userid == data.userid){
                console.log("데이터 삭제"+allrooms[data.room].length)
                console.log("데이터 삭제"+ allrooms[data.room][i].socket)
                allrooms[data.room].splice(i,1);
                data.msg=data.userid+'가 방을 나갓습니다';
                console.log("데이터 삭제"+allrooms[data.room].length)
                console.log("데이터 삭제"+ allrooms[data.room][i])
            }
           }
        }
       

    function catroommsg(chatroom,data) {
        for(var i=0; i<chatroom.length; i++){
            console.log("데이터 보내기"+ allrooms[data.room][i].socket+"  "+i+"번째 "+allrooms[data.room][i].userid)
             chatroom[i].socket.emit('roommsg',data)
            }
    }


});
http.listen(3000, function(){
    console.log('listening on *:3000');
});