---------------------------------------------------

This is a basic web server to share files with a custom video and audio player and the rest of files will be interpreted by the browser

---------------------------------------------------

The video player supports subtittles and changing the audio track<br>
Some browsers cannot play some video formats because this project is not using transcoding to convert in realtime the video/sound, it only converts the subtitles.<br>
To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser.<br>
Because of the limitations of HTLM5 it can only play webVTT subs but dont worry it will convert it automatically.<br>

---------------------------------------------------

<b>Requirements:</b> <br>
 Python3<br>
 Windows/Linux

<b>Dependencys:</b> <br>
 python3  flask(pip) ffmpeg(as a command)

<b>Usage:</b> <br>
  python3 run.py -b IP_addr -p port -d directory [--dirsize]<br>
  or for use a WSGI for deployment -> (for example gunicorn)
  gunicorn --env FOLDER=/PATH --env SHOWSIZE=True -b 127.0.0.1 -w 2 app/app:app

---------------------------------------------------
