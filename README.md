---------------------------------------------------

This is a basic web server to share files with a custom video and audio player and the rest of files will be interpreted by the browser

---------------------------------------------------

The video player supports subtittles and changing the audio track<br>
Some browsers cannot play some video formats because this project is not using transcoding to convert in realtime the video/sound, it only converts the subtitles.<br>
To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser.<br>
Because of the limitations of HTLM5 it can only play webVTT subs but dont worry it will convert it automatically.<br>

---------------------------------------------------

To change the options you can edit the config.cfg inside the bin dir, create a custom one or passing an arg to the main file located in bin/main.py.
On that config file you can add ports and IP separated by "," to listen to (for example if you put 2 ports and 2 IPs both IPs will listen both ports)
It makes easier to configure it to use it with a load-balancer proxy like nginx Because it will spawn a new process for each port and ip

---------------------------------------------------
Requirements:
 Python3 (tested under python 3.12)
 Windows/Linux

Dependencys:
 python3  flask(pip) pysubs2(pip) ffmpeg(as a command)

Usage:
  python3 start.py [config.file]
  or python3 bin/main.py -b IP_addr -p port -d directory [--dirsize]
  
  ---------------------------------------------------
