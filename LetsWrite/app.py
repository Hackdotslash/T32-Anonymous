from __future__ import with_statement     
from flask import Response
import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, abort, redirect
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant, ChatGrant
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.messaging_response import MessagingResponse
from PIL import Image
import re 
import base64
import requests
import cv2
import numpy as np
import json

from time import sleep

from flask_socketio import SocketIO
from threading import Thread

import requests
import sys
import traceback
import urllib

import json
import pyaudio
from rev_ai.models import MediaConfig
from rev_ai.streamingclient import RevAiStreamingClient
from six.moves import queue

import os
import string
import random
from os import listdir
from os.path import isfile, join, splitext
import time
import sys
import numpy as np
import argparse

async_mode = None

app = Flask(__name__)
socketio = SocketIO(app, async_mode=None, cors_allowed_origins="*",logger=True, engineio_logger=True)

load_dotenv()
twilio_account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
twilio_api_key_sid = os.environ.get('TWILIO_API_KEY_SID')
twilio_api_key_secret = os.environ.get('TWILIO_API_KEY_SECRET')
twilio_client = Client(twilio_api_key_sid, twilio_api_key_secret,
                       twilio_account_sid)


def processImage():
    # Load in the image using the typical imread function using our watch_folder path, and the fileName passed in, then set the final output image to our current image for now
    image = cv2.imread("./output.png")
    print(image)
    output = image

    hMin = 29  # Hue minimum
    sMin = 30  # Saturation minimum
    vMin = 0   # Value minimum (Also referred to as brightness)
    hMax = 179 # Hue maximum
    sMax = 255 # Saturation maximum
    vMax = 255 # Value maximum
    # Set the minimum and max HSV values to display in the output image using numpys' array function. We need the numpy array since OpenCVs' inRange function will use those.
    lower = np.array([hMin, sMin, vMin])
    upper = np.array([hMax, sMax, vMax])
    # Create HSV Image and threshold it into the proper range.
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV) # Converting color space from BGR to HSV
    mask = cv2.inRange(hsv, lower, upper) # Create a mask based on the lower and upper range, using the new HSV image
    # Create the output image, using the mask created above. This will perform the removal of all unneeded colors, but will keep a black background.
    output = cv2.bitwise_and(image, image, mask=mask)
    # Add an alpha channel, and update the output image variable
    *_, alpha = cv2.split(output)
    dst = cv2.merge((output, alpha))
    output = dst
    # Resize the image to 512, 512 (This can be put into a variable for more flexibility), and update the output image variable.
    dim = (512, 512)
    output = cv2.resize(output, dim)
    cv2.imwrite("./processed.png",output)


def get_chatroom(name):
    for conversation in twilio_client.conversations.conversations.list():
        if conversation.friendly_name == name:
            return conversation

    # a conversation with the given name does not exist ==> create a new one
    return twilio_client.conversations.conversations.create(
        friendly_name=name)


rate = 44100
chunk = int(rate/10)

# Insert your access token here
access_token = "02VN45AJL29kSetOgcKSu4ITi_VveOV32tYaGYuTcgdNVfLZcgef5lanKGOI75BFsLXj6d6Qb9UDKWgPJNwamNFoO45Ws"


thread = Thread()

# Creates a media config with the settings set for a raw microphone input
example_mc = MediaConfig('audio/x-raw', 'interleaved', 44100, 'S16LE', 1)

streamclient = RevAiStreamingClient(access_token, example_mc)

class MicrophoneStream(object):
    """Opens a recording stream as a generator yielding the audio chunks."""
    def __init__(self, rate, chunk):
        self._rate = rate
        self._chunk = chunk
        # Create a thread-safe buffer of audio data
        self._buff = queue.Queue()
        self.closed = True

    def __enter__(self):
        self._audio_interface = pyaudio.PyAudio()
        self._audio_stream = self._audio_interface.open(
            format=pyaudio.paInt16,
            # The API currently only supports 1-channel (mono) audio
            channels=1, rate=self._rate,
            input=True, frames_per_buffer=self._chunk,
            # Run the audio stream asynchronously to fill the buffer object.
            # This is necessary so that the input device's buffer doesn't
            # overflow while the calling thread makes network requests, etc.
            stream_callback=self._fill_buffer,
        )

        self.closed = False

        return self

    def __exit__(self, type, value, traceback):
        self._audio_stream.stop_stream()
        self._audio_stream.close()
        self.closed = True
        # Signal the generator to terminate so that the client's
        # streaming_recognize method will not block the process termination.
        self._buff.put(None)
        self._audio_interface.terminate()

    def _fill_buffer(self, in_data, frame_count, time_info, status_flags):
        """Continuously collect data from the audio stream, into the buffer."""
        self._buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self):
        while not self.closed:
            # Use a blocking get() to ensure there's at least one chunk of
            # data, and stop iteration if the chunk is None, indicating the
            # end of the audio stream.
            chunk = self._buff.get()
            if chunk is None:
                return
            data = [chunk]

            # Now consume whatever other data's still buffered.
            while True:
                try:
                    chunk = self._buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break

            yield b''.join(data)



def get_Text():
    with MicrophoneStream(rate, chunk) as stream:
        # Uses try method to allow users to manually close the stream
        try:
            # Starts the server connection and thread sending microphone audio
            response_gen = streamclient.start(stream.generator())

            # Iterates through responses and prints them
            for response in response_gen:
                y = json.loads(response)
                v = []
                for i in y["elements"]:
                    v.append(i["value"])
                
                socketio.emit('newnumber', {'value': ' '.join(v)}, namespace='/test')
                print("successfully emitted")
                sleep(1)
                 
        except KeyboardInterrupt:
            # Ends the websocket connection.
            streamclient.client.send("EOS")
            pass


@app.route('/')
def index():
    return render_template('main.html')

@app.route('/home')
def home():
    return render_template('index1.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.get_json(force=True).get('username')
    if not username:
        abort(401)

    conversation = get_chatroom('My Room')
    try:
        conversation.participants.create(identity=username)
    except TwilioRestException as exc:
        # do not error if the user is already in the conversation
        if exc.status != 409:
            raise

    token = AccessToken(twilio_account_sid, twilio_api_key_sid,
                        twilio_api_key_secret, identity=username)
    token.add_grant(VideoGrant(room='My Room'))
    token.add_grant(ChatGrant(service_sid=conversation.chat_service_sid))

    return {'token': token.to_jwt().decode(),
            'conversation_sid': conversation.sid}

@app.route('/token')
def token():
    # Get credentials for environment variables

    # Create an Access Token
    token = AccessToken(twilio_account_sid, twilio_api_key_sid, twilio_api_key_secret)

    # Set the Identity of this token
    token.identity = request.values.get('identity') or 'identity'

    # Return token
    return token.to_jwt()


@socketio.on('connect', namespace='/test')
def test_connect():
    global thread
    print('Client connected')
    thread = socketio.start_background_task(target=get_Text)

@app.route("/process1",methods=['GET','POST'])
def process1():
    image_b64=request.values[('imageBase64')]

    imgstr=re.search(r'data:image/png;base64,(.*)',image_b64).group(1)
    # print(imgstr)
    output=open('output.png', 'wb')
    decoded=base64.b64decode(imgstr)
    output.write(decoded)
    output.close()


    processImage()

    ans=''
    with open("./processed.png", "rb") as file:
        url = "https://api.imgbb.com/1/upload"
        payload = {
            "key": 'f458d32e54f5653de50e29f07a931015',
            "image": base64.b64encode(file.read()),
        }
        res = requests.post(url, payload)
        print(res.json())
        ans=res.json()['data']['url']

    print(ans)
    return ans 



if __name__ == '__main__':
    socketio.run(app,debug=True)
