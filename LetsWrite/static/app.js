
const root = document.getElementById('root');
const usernameInput = document.getElementById('username');
const button = document.getElementById('join_leave_student');
const shareScreen = document.getElementById('share_screen');
const toggleChat = document.getElementById('toggle_chat');
const container = document.getElementById('container');
const count = document.getElementById('count');
const chatScroll = document.getElementById('chat-scroll');
const chatContent = document.getElementById('chat-content');
const chatInput = document.getElementById('chat-input');
const lableInput = document.getElementById('one');
const localDiv = document.getElementById('local');
const clickHere = document.getElementById('btnScreenshot');
const images = document.getElementById('imageDiv');

let connected = false;
let room;
let chat;
let conv;
let screenTrack;

// let dict = {};

let dict = new Map();

let now_streaming;

let mentor;

let recent_message;

function addLocalVideo() {
    Twilio.Video.createLocalVideoTrack().then(track => {
        // let video = document.getElementById('myVideo');
        // let trackElement = track.attach();
        let trackElement = document.getElementById('video');
        trackElement.addEventListener('click', () => { zoomTrack(trackElement); });
        // video.appendChild(trackElement);
        // console.log(trackElement);
        // trackElement.setAttribute("id", "video2");
        // console.log(video);
    });
};


function capture1() {
    var canvas = document.getElementById('canvas');
    var video = document.getElementById('video');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);  
    var img1 = canvas.toDataURL();
    $.ajax({
                url: '/process1',
                data: {
                    imageBase64 : img1                    
                },
                type: 'POST',
                success: function(data){
                    // $("#result").text("Predicted Output : "+data);
                    // canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight); 
                    console.log("success!!")
                    // console.log(data)
                    conv.sendMessage(data);
                } 
            })

    // conv.sendMessage("https://i.pinimg.com/originals/83/f9/37/83f937b69f30bb886ab8a03390da6771.jpg");
};

function assignMentor(event){
    connectButtonHandler(event);
    mentor = usernameInput.value;
    console.log(mentor);
    // Disable Mentor Button
    document.getElementById('join_leave_mentor').style.display = "none";
    document.getElementById('Turn').style.display = "none";
    now_streaming = mentor;
    
}

function assignStudent(event){
    connectButtonHandler(event);
    document.getElementById('join_leave_mentor').style.display = "none";
    document.getElementById('Turn').style.display = "block";
    document.getElementById('Allow').style.display = "none";
    document.getElementById('cls').style.display = "none";
    document.getElementById('turn_over').style.display = "none";
}


function connectButtonHandler(event) {
    event.preventDefault();
    if (!connected) {
        let username = usernameInput.value;
        if (!username) {
            alert('Enter your name before connecting');
            return;
        }
        button.disabled = true;
        button.innerHTML = 'Connecting...';
        connect(username).then(() => {
            lableInput.innerHTML = username;
            button.innerHTML = 'Leave call';
            button.disabled = false;
            shareScreen.disabled = false;
            capture.disabled = false;
        }).catch(() => {
            alert('Connection failed. Is the backend running?');
            button.innerHTML = 'Join call';
            button.disabled = false;
        });
    }
    else {
        disconnect();
        button.innerHTML = 'Join call';
        connected = false;
        shareScreen.innerHTML = 'Share screen';
        shareScreen.disabled = true;
        capture.disabled = true;
    }
};
 
function connect(username) {
    let promise = new Promise((resolve, reject) => {
        // get a token from the back end
        let data;
        fetch('/login', {   
            method: 'POST',
            body: JSON.stringify({'username': username})
        }).then(res => res.json()).then(_data => {
            // join video call
            data = _data;
            return Twilio.Video.connect(data.token);
        }).then(_room => {
            room = _room;
            if(username != now_streaming){
                localDiv.className = "participantHidden";
            }
            room.participants.forEach(participantConnected);
            room.on('participantConnected', participantConnected);
            room.on('participantDisconnected', participantDisconnected);
            connected = true;
            updateParticipantCount();
            devicesDisplay();
            // alert("Connect Chat Called");
            connectChat(data.token, data.conversation_sid);
            resolve();
        }).catch(e => {
            console.log(e);
            reject();
        });
    });
    return promise;
};


function attachTracks(tracks, container) {

  tracks.forEach(function(track) {
    if (track) {
      let v = track.attach();
      v.setAttribute('id','video');
      console.log(v);
      container.appendChild(v);
      let d = document.getElementById("myVideo");
      console.log(d.childNodes);
      d.removeChild(d.childNodes[1]);
    }
  });
  // console.log("Hrll");
   
}

function detachTracks(tracks) {
  tracks.forEach(function(track) {
    if (track) {
      track.detach().forEach(function(detachedElement) {
        detachedElement.remove();
      });
    }
  });
}


function stopTracks(tracks) {
  tracks.forEach(function(track) {
    if (track) { track.stop(); }
  })
}



function devicesDisplay(){
  navigator.mediaDevices.enumerateDevices().then(gotDevices);
  const select = document.getElementById('video-devices');
  select.addEventListener('change', updateVideoDevice);

}

function gotDevices(mediaDevices) {
  console.log("KK");
  const select = document.getElementById('video-devices');
  select.innerHTML = `<option value="0">
                    <i class="fas fa-camera" style="color:white"></i> Select Camera
                </option>`;
  
  let count = 1;
  mediaDevices.forEach(mediaDevice => {
    if (mediaDevice.kind === 'videoinput') {
      const option = document.createElement('option');
      option.value = mediaDevice.deviceId;
      const label = mediaDevice.label || `Camera ${count++}`;
      const textNode = document.createTextNode(label);
      option.appendChild(textNode);
      select.appendChild(option);
    }
  });
}


function updateVideoDevice(event) {
  const select = event.target;
  const localParticipant = room.localParticipant;
  if (select.value !== '') {
    const tracks = Array.from(localParticipant.videoTracks.values()).map(
      function(trackPublication) {
        return trackPublication.track;
      }
    );
    localParticipant.unpublishTracks(tracks);
    console.log(localParticipant.identity + ' removed track: ' + tracks[0].kind);

    detachTracks(tracks);
    stopTracks(tracks);
    Twilio.Video.createLocalVideoTrack({
      deviceId: { exact: select.value }
    }).then(function(localVideoTrack) {
      localParticipant.publishTrack(localVideoTrack);
      console.log(localParticipant.identity + ' added track: ' + localVideoTrack.kind);
      const previewContainer = document.getElementById('myVideo');
      attachTracks([localVideoTrack], previewContainer);
    });
  }
}



function updateParticipantCount() {
    if (!connected)
        count.innerHTML = 'Disconnected.';
    else
        count.innerHTML = (room.participants.size + 1) + ' participants online.';
};



function participantConnected(participant) {
    let participantDiv = document.createElement('div');
    participantDiv.setAttribute('id', participant.sid);
    participantDiv.setAttribute('class',participant.identity==now_streaming?'participant':'participantHidden');
    let tracksDiv = document.createElement('div');
    participantDiv.appendChild(tracksDiv);

    let labelDiv = document.createElement('div');
    labelDiv.setAttribute('class', 'label');
    labelDiv.innerHTML = participant.identity;
    participantDiv.appendChild(labelDiv);

    dict[participant.identity] = participant.sid;

    container.appendChild(participantDiv);

    participant.tracks.forEach(publication => {
        if (publication.isSubscribed)
            trackSubscribed(tracksDiv, publication.track);
    });
    participant.on('trackSubscribed', track => trackSubscribed(tracksDiv, track));
    participant.on('trackUnsubscribed', trackUnsubscribed);

    updateParticipantCount();
};

function participantDisconnected(participant) {
    document.getElementById(participant.sid).remove();
    updateParticipantCount();
};

function trackSubscribed(div, track) {
    let trackElement = track.attach();
    trackElement.addEventListener('click', () => { zoomTrack(trackElement); });
    div.appendChild(trackElement);
};

function trackUnsubscribed(track) {
    track.detach().forEach(element => {
        if (element.classList.contains('participantZoomed')) {
            zoomTrack(element);
        }
        element.remove()
    });
};

function disconnect() {
    room.disconnect();
    if (chat) {
        chat.shutdown().then(() => {
            conv = null;
            chat = null;
        });
    }
    while (container.lastChild.id != 'local')
        container.removeChild(container.lastChild);
    button.innerHTML = 'Join call';
    if (root.classList.contains('withChat')) {
        root.classList.remove('withChat');
    }
    toggleChat.disabled = true;
    connected = false;
    updateParticipantCount();
};

function shareScreenHandler() {
    event.preventDefault();
    if (!screenTrack) {
        navigator.mediaDevices.getDisplayMedia().then(stream => {
            screenTrack = new Twilio.Video.LocalVideoTrack(stream.getTracks()[0]);
            room.localParticipant.publishTrack(screenTrack);
            screenTrack.mediaStreamTrack.onended = () => { shareScreenHandler() };
            console.log(screenTrack);
            shareScreen.innerHTML = 'Stop sharing';
        }).catch(() => {
            alert('Could not share the screen.')
        });
    }
    else {
        room.localParticipant.unpublishTrack(screenTrack);
        screenTrack.stop();
        screenTrack = null;
        shareScreen.innerHTML = 'Share screen';
    }
};

function zoomTrack(trackElement) {



    if (!trackElement.classList.contains('trackZoomed')) {
        // zoom in
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                let zoomed = false;
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.add('trackZoomed')
                        zoomed = true;
                    }
                });
                if (zoomed) {
                    participant.classList.add('participantZoomed');
                }
                else {
                    participant.classList.add('participantHidden');
                }
            }
        });
    }
    else {
        // zoom out
        container.childNodes.forEach(participant => {
            if (participant.classList && participant.classList.contains('participant')) {
                participant.childNodes[0].childNodes.forEach(track => {
                    if (track === trackElement) {
                        track.classList.remove('trackZoomed');
                    }
                });
                participant.classList.remove('participantZoomed')
                participant.classList.remove('participantHidden')
            }
        });
    }
};

function connectChat(token, conversationSid) {
    return Twilio.Conversations.Client.create(token).then(_chat => {
        chat = _chat;
        return chat.getConversationBySid(conversationSid).then((_conv) => {
            conv = _conv;
            conv.on('messageAdded', (message) => {
                const val = parseURL(message.author, message.body);
                if(val == 0)
                    addMessageToChat(message.author, message.body);
            });
            return conv.getMessages().then((messages) => {
                chatContent.innerHTML = '';
                console.log(messages.items);
                if(usernameInput.value == mentor){
                    conv.sendMessage('Mentor joined '+mentor);
                }
                // alert("Let See");
                // for (let i = 0; i < messages.items.length; i++) {
                //     addMessageToChat(messages.items[i].author, messages.items[i].body);
                // }
                toggleChat.disabled = false;
            });
        });
    }).catch(e => {
        console.log(e);
    });
};

function addMessageToChat(user, message) {
    chatContent.innerHTML += `<p><b>${user}</b>: ${message}`;
    chatScroll.scrollTop = chatScroll.scrollHeight;
}

function toggleChatHandler() {
    event.preventDefault();
    if (root.classList.contains('withChat')) {
        root.classList.remove('withChat');
    }
    else {
        root.classList.add('withChat');
        chatScroll.scrollTop = chatScroll.scrollHeight;
    }
};

function onChatInputKey(ev) {
    if (ev.keyCode == 13) {
        conv.sendMessage(chatInput.value);
        chatInput.value = '';
    }
};


document.getElementById("Turn").onclick = function() {
    conv.sendMessage("accept " + usernameInput.value);
}

document.getElementById("Allow").onclick = function() {
    if(mentor == usernameInput.value){
        conv.sendMessage("Access Allowed to "+recent_message);
    }
}

document.getElementById("turn_over").onclick = function() {
    conv.sendMessage("Access Granted to "+mentor);
}

document.getElementById("cls").onclick = function() {
    conv.sendMessage("clear screen");
    images.innerHTML = "";
}

function parseURL(author, message) {
    if(message.startsWith("https")){
        // document.getElementById("myImg").src = message;

        let image = document.createElement('img');

        image.setAttribute('class','myImg');

        image.setAttribute('src',message);

        images.appendChild(image);

        return 1;

    }
    else if(message.startsWith("accept")){

        recent_message = author;
    
    }
    else if(message.startsWith("Access Granted ")== true && author == mentor){
        var now_id = dict[now_streaming];
        var want_id = dict[author];
        
        if(now_id==undefined){
            now_id = "local";
        }
        if(want_id == undefined){
            want_id = "local";
        }

        console.log(now_id);
        console.log(want_id);

        if(now_id != want_id){
            document.getElementById(now_id).setAttribute('class','participantHidden');
            document.getElementById(want_id).setAttribute('class','participant');
        }
        now_streaming = author;
    }

    else if(message.startsWith("Access Allowed") == true && author == mentor){
        
        var now_id = dict[now_streaming];
        var want_id = dict[recent_message];
        
        if(now_id==undefined){
            now_id = "local";
        }
        if(want_id == undefined){
            want_id = "local";
        }

        console.log(now_id);
        console.log(want_id);

        if(now_id != want_id){
            document.getElementById(now_id).setAttribute('class','participantHidden');
            document.getElementById(want_id).setAttribute('class','participant');
        }
        now_streaming = recent_message;

    }
    else if(message.startsWith("Mentor joined") == true){
        var want_id = dict[author];
        if(want_id == undefined){
            want_id = "local";
        }
        document.getElementById(want_id).setAttribute('class','participant');

        now_streaming = author;
        mentor = author;
    }
    else if(message.startsWith("clear screen") == true && author == mentor){
        images.innerHTML = "";
    }

    return 0;
}


addLocalVideo();
// rearCamera();
// clickHere.addEventListener('click',rearCamera);

document.getElementById('join_leave_mentor').addEventListener('click', assignMentor);
button.addEventListener('click', assignStudent);
shareScreen.addEventListener('click', shareScreenHandler);
toggleChat.addEventListener('click', toggleChatHandler);
chatInput.addEventListener('keyup', onChatInputKey);

