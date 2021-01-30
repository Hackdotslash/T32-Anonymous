import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, abort, redirect
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant, ChatGrant
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.messaging_response import MessagingResponse


app = Flask(__name__)


@app.route('/')
def index():
    return render_template('main.html')

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

# Code Changes from here 

@app.route('/token')
def token():
    # Get credentials for environment variables

    # Create an Access Token
    token = AccessToken(twilio_account_sid, twilio_api_key_sid, twilio_api_key_secret)

    # Set the Identity of this token
    token.identity = request.values.get('identity') or 'identity'

    # Return token
    return token.to_jwt()


@app.route("/process1",methods=['GET','POST'])
def process1():
    global api_counter
    image_b64=request.values[('imageBase64')]
    print()
    print()
    print("Testing Image")
    print()
    print()

    ans=''
    with open("output4.png", "rb") as file:
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
    app.run(host='0.0.0.0')
