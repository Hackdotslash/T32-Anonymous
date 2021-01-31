# Let's Write 

Our world is enriched with a variety of people.Many of them are privileged to have all their senses working properly, while some have a slight disadvantage of not having some of their senses working  properly ,like people who could not speak.They constitute to be among the 5% people in the world.We don’t call them disabled, rather we call them as differently abled.The only way for them to communicate is either by writing or through digital typing .Certainly we have several technologies for them to communicate via typing.Some technologies like sign language to communicate with persons who are like them.However they lag behind when it comes to write.Education is incomplete without one holding a pen and paper.However it is not possible for every such differently abled person to reach to teachers in classroom mode, especially for ones who reside in rural areas and who are financially very weak to hire personal teachers for aid.The situation has become worse in pandemic.

What we are trying to do in our solution is ,we will be creating an online board where mute person will be able to connect to a mentor on a video call. Both will be equipped with a mobile phone, pen and paper. Mentor will start making some sort of symbols like alphabets,numbers and basic stuffs for a new comer,a snapshot will be taken and the letter or symbol he has drawn will get binarized and come on the screen with a transparent background, then the impaired person  will imitate the same sign /alphabet ,click a snapshot .By this both mentor’s and mute person’s symbols will come on the screen in parallel.Both the mentor and student can compare what each one of them has written, and how different they are.This way mentor will be able to guide the person at what point he has missed , and the person without speaking will communicate through his drawings.

## APIs Used :- 

Twillio (For Video Streaming)

## Front End
We have used HTML, CSS, and Javascript for frontend part.

## Back End
We have used Flask for backend.

## Setup/Installation

1. [Create a Twilio account](https://www.twilio.com) (if you don't have one yet). It's free!


2. [Generate an API Key](https://www.twilio.com/console/project/api-keys) for your account.

3. Now, set the directory path where you want to clone and also the directory where you will write solutions

```sh
cd INSTALLATION_PATH 
```
4.  Clone this repository or you can download and extact the zip file.

5. Move to the project directory
```sh
cd LetsWrite
```
6. Copy paste the API Keys from your twillio account after making a copy of .env.template
```sh
cp .env.template .env
```
7. Create a virtual environment
```sh
pip install virtualenv
virtualenv venv
```
- Activate virtual environment (macOS or Linux)
```sh
source venv/Scripts/activate
```
- Activate virtual environment (Windows)

```sh
venv\Scripts\activate 
```
8. Installing requirements
```sh
pip install -r requirement.txt
```

9. Starting the backend server
```sh
python app.py 
```
10. Making a public server using ngrok
- Open another terminal for creating public server
- Move to the project directory 
- Create virtual environment as above
- start the server which will act as a public server for localhost 5000 


```sh
ngrok http 5000
```

## Working

There is a mentor which starts the server and creates a public URL for it. This URL is shared among the students, and the students join. The public URL works as a room where all participants can see the screen of mentor. As an example, in the below section of snapshots, the first image shows the screen of mentor. The mentor then clicks the capture button on the application. A snapshot of present screen is taken and the background is removed. Then this image is imprinted on the on going video stream of mentor, which is visible to all. Then, if any student have a doubt in any step or want to draw anything on his/her notebook and share with the mentor, the capture button is clicked on the student side and same process happens again. 


## Team Members

* Jainil Shah
* Adit Alware
* Abhinav Gupta
