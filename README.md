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

Requirements:<br>
 Python3<br>
 Windows/Linux

Dependencys:<br>
 python3  flask(pip) ffmpeg(as a command)

Usage: <br>
  python3 app/main.py -b IP_addr -p port -d directory [--dirsize]<br>
  or for use a WSGI for deployment -> (for example gunicorn)
  gunicorn --env FOLDER=/PATH--env SHOWSIZE=True -b 127.0.0.1 -w 2 app/app:app
  

 Logging:<br>
    To create a log of all access and responses and erros of the server you can redirect
    stderr to a file (2>file), in stdout is only the banner and info

  ---------------------------------------------------
