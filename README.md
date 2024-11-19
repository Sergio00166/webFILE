# Web Server with custom video and audio player #


The video player supports subtittles and changing the audio track

Some browsers cannot play some video formats because this project is not using transcoding to convert in realtime the video/sound.

To change the audio track from a video you must need to enable "Experimental Web Platform features" in your browser.

### It supports natively ASS/SSA subtitles by using JASSUB to render the subtitles and also other codecs (will be converted to webVTT) ###  
If the browser does not support JASSUB or does not show any subtitles or in a weird way you can fallback to webVTT
by holding the click on the setting icon until it changes the color.


## Requirements: ##
 Python3, Windows/Linux, Flask, ffmpeg


## To run the web server: ##
  - To run via flask internal HTTP server via CLI  
    ```python3 run.py -b IP_addr -p port -d directory [--dirsize]```

  - To use a WSGI for deployment -> (for example gunicorn)  
    ```gunicorn --env FOLDER=directory [--env SHOWSIZE=True] -b IP_addr app:app```



## API usage ##

To get the JSON you need to use curl or wget or send a request asking for a JSON (set in headers ACCEPT:"application/json").

For the text browsers and legacy browsers there is a custom html for better browsing (for lynx, links, w3m, ie explorer).

**To download a folder you must pass at the end of the dir path /?mode=dir to download it as tar.**  
Or click the donwload option when there is nothing selected (modern browsers) or in basic html mode just click the button "dl dir"

### To sort directory contents, add /?mode= followed by: ###

- *Sort type*
  - *s* for size
  - *n* for name
  - *d* for date

- *Sort direction*
  - *p* for ascending
  - *d* for descending

