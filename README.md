---------------------------------------------------

This is a basic web server to share files with a custom video and audio player and the rest of files will be interpreted by the browser

---------------------------------------------------

The video player supports subtittles and changing the audio track<br>
Some browsers cannot play some video formats because this project is not using transcoding to convert in realtime the video/sound, it only converts the subtitles.<br>
To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser.<br>
Because of the limitations of HTLM5 it can only play webVTT subs but dont worry it will convert it automatically.<br>

---------------------------------------------------

<b>Requirements:</b> <br>
 Python3, Windows/Linux, Flask, ffmpeg
 <br>This software includes pysubs2 module under the MIT license, you can find the complete LICENSE in app/data/pysubs2.LICENSE

<b>Usage:</b> <br>
  - To run via flask internal HTTP server via CLI <br>
  python3 scripts/run.py -b IP_addr -p port -d directory [--dirsize] <br>
  - To run via flask internal HTTP server with config file (for use with load balancer) <br>
  python3 scripts/start.py config.cfg <br>
    - you can specify the ports with a range like 8000-8007 to spawn 8 workers and distribute the load with nginx
  - To use a WSGI for deployment -> (for example gunicorn)<br>
  cd app; gunicorn -R --env FOLDER=/PATH --env SHOWSIZE=True -b 127.0.0.1 -w 2 app:app <br>
  <b>WARNING: slow video streaming with gunicorn</b>

---------------------------------------------------
