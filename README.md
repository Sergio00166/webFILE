This is a basic web interface to share files and can play music and videos, read pdfs and read plain text, and if it cannot do that it would download the file

Same as python3 -m http.server but more customizable (you can make it look better editting the index.html located on the templates directory)
<br>With a custom video and audio player

Some browsers cannot play some video formats, and others can because this project is not using transcoding (and will not) to convert in realtime the media

To change the options you can edit the config.cfg

Requirements:
 Python3 (tested under python 3.12)
 Windows/Linux

Dependencys:
 flask

Usage:
  python3 main.py [config.file]
