

**This is a basic web server to share files with a custom video and audio player and the rest of files will be interpreted by the browser**

---------------------------------------------------

The video player supports subtittles and changing the audio track

Some browsers cannot play some video formats because this project is not using transcoding to convert in realtime the video/sound, it only converts the subtitles.

To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser.

Because of the limitations of HTLM5 it can only play webVTT subs but dont worry it will convert it automatically.

---------------------------------------------------

**Requirements:**
 Python3, Windows/Linux, Flask, ffmpeg

 This software includes pysubs2 module under the MIT license
 you can find the complete LICENSE inside the zip file in app/data/pysubs2.zip

---------------------------------------------------

**API usage**

To get the JSON you need to use curl or wget or send a request asking for a JSON.

For the cli text browsers there is a custom html for better browsing (for lynx, links, elinks and w3m).

---------------------------------------------------

**Usage:**
  - To run via flask internal HTTP server via CLI
  python3 scripts/run.py -b IP_addr -p port -d directory [--dirsize]
  - To run via flask internal HTTP server with config file (for use with load balancer)
  python3 scripts/start.py config.cfg
    - you can specify the ports with a range like 8000-8007 to spawn 8 workers and distribute the load with nginx
  - To use a WSGI for deployment -> (for example gunicorn)
  cd app; gunicorn -R --env FOLDER=/PATH --env SHOWSIZE=True -b 127.0.0.1 app:app

  ***WARNING: Slow video streaming with gunicorn***

---------------------------------------------------
