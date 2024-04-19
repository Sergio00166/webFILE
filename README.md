This is a basic web interface to share files and can play music and videos, read pdfs and read plain text, and if it cannot do that it would download the file

It is intended for a home usage

Windows Defender nowadays detects it the static/js/audio.js as a troyan, please read that file making sure it is correct
for you and later disable defender to donwload the file (or zip) if you are under Windows OS

Some browsers cannot play some video formats, and others can because this project is not using transcoding (and will not) to convert in realtime the media

To change the options you can edit the config.cfg inside the bin dir, create a custom one or passing an arg to the main file located in bin/main.py
On that file you can add ports and IP separated by "," to listen to (for example if you put 2 ports and 2 IPs both IPs will listen both ports)
It makes easier to configure it to use it with a load-balancer proxy like nginx Because it will spawn a new process for each port and ip

To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser

Extra: Using /?subtitles=index/videopath will download the index subtitle from that video

---------------------------------------------------
Requirements:
 Python3 (tested under python 3.12)
 Windows/Linux

Dependencys:
 python3  flask(python3)  ffmpeg(as a command)

Usage:
  python3 start.py [config.file]
  or python3 bin/main.py -b IP_addr -p port -d directory [--dirsize]
  
----------------------------------------------------
