$(document).ready(function(){

    $('#msg').after("<br>");

    var socket = io.connect('http://' + location.host);
    var tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    };
    var msgs = [];

    var replaceTag = function (tag) {
        return tagsToReplace[tag] || tag;
    };
    var safe_tags_replace = function (str) {
        return str.replace(/[&<>]/g, replaceTag);
    };
    var sendMsg = function () {
        if($('#nick').attr('disabled') == undefined)
            $('#nick').attr('disabled','disabled');

        var msg = {
                nick: $('#nick').val(),
                msg:  safe_tags_replace($('#msg').val())
            };
        socket.emit('send msg',msg);
    };
       
     $('#msgForm').submit(function(e){
        e.preventDefault();
        
        sendMsg();
        $('#msg').val("");
    });

    $('#crtRoom').submit(function(e){
        e.preventDefault();
        socket.emit('createRoom', $('#roomname').val());
        $('#roomname').val("");
    });

    var roomClick = function(e){
        console.log("click");
        $(".room").css('background','none');
         $(this).css('background', "lime");
         
        socket.emit('changeRoom',$(this).attr('id'));
    }
    $('.room').click(roomClick);

    socket.on('connect', function () {
        socket.emit('conn',"pls");
        $('.bulb').html("<img src='/img/bullet_green.png' alt='bulb'/> Connected");
    });
    socket.on('history', function (data) {
        var text = "";
        $.each(data,function(i,el){
            text += el.nick + ": " + el.msg + "<br>";
        });
        $('#chat').html(text);
        $("#chat").scrollTop($('#chat')[0].scrollHeight); 
    });
    socket.on('rec msg', function (data) {
        var text = data.nick + ": " + data.msg + "<br>";
        $('#chat').html($('#chat').html()+text);
        $("#chat").animate({ scrollTop: $('#chat')[0].scrollHeight }, "fast");
    });
    socket.on('rooms', function (data) {
        var text = "";
        $.each(data,function(i,el){
            text += "<div id='"+el.id+"' class='room'>"+el.name+"</div>";
        });
        $('#rooms').html(text);
        $('.room').click(roomClick);
    });
});
