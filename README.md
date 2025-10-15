# Web Server with Custom Video & Audio Player

A lightweight Python -based HTTP file server with built-in streaming for video and audio.    
Supports ACL-based access control, uploads, and file operations.

---

## Table of Contents

* [🔍 Overview](#overview)
* [🎧 Multimedia Streaming](#multimedia-streaming)
* [🔐 ACL & User Management](#acl--user-management)
* [📂 Requirements](#requirements)
* [⚙️ Configuration](#configuration)
* [🔢 File Listing API](#file-listing-api)
* [🔍 Endpoints](#endpoints)
* [💡 Other HTTP Methods](#other-http-methods)
* [📄 HTML vs .web Extensions](#html-vs-web-extensions)
* [🔹 Official Plugins](#official-plugins)
* [🚀 Running the Server](#running-the-server)
* [🔒 License](#license)

---

## Overview

This service exposes a filesystem directory over HTTP, enabling:

* **File operations**: upload, create, delete.
* **Streaming**: streaming via browser-supported formats using HTTP 206. No transcoding, no overhead.
* **Access control** via On-memory hashmap-based ACLs (read/write/deny per resource and user).
* Also it detects if a directory is a mount point and changes its type (and icon).

## Multimedia Streaming

* Leverages browser-native codecs only.
* Caches metadata and subtitles to minimize `ffmpeg` calls.
* Switch audio tracks in-browser (requires experimental Web Platform Features).
* SSA/ASS subtitle support via `JASSUB` on the client.
* On-demand SSA/ASS → WebVTT conversion, used when JASSUB does not render or fails.    
  To enable, press and hold the settings button in the player until it changes color.
* Extracts embedded subtitles and chapter data from `.mkv`, `.mp4`, etc.
* Auto-loads external `.mks` subtitles matching video basename.

## ACL & User Management

* Managed by `aclmgr.py` in the `app/` directory.
* ACLs define per-path permissions: read-only, write, or denied.
* User accounts stored in JSON (`data/users.json`).
* ACL rules stored in JSON (`data/acl.json`).
* Both files will be loaded onto RAM as an dict.
* See [aclmgr documentation](aclmgr.md).

## Requirements

```bash
pip install -r requirements.txt
```

Install `ffmpeg` at the system level for media playback.   
A `Redis` sever for session storage and other cache.   

## Configuration

Configure via environment variables:

| Variable        | Required | Default          | Description                                     |
| --------------- | -------- | ---------------- | ----------------------------------------------- |
| SERVE\_PATH     | Yes      | —                | Directory to serve.                             |
| ERRLOG\_FILE    | No       | data/error.log   | Server error log.                               |
| ACL\_FILE       | No       | data/acl.json    | ACL rules file.                                 |
| USERS\_FILE     | No       | data/users.json  | User accounts file.                             |
| SECRET\_KEY     | No       | Auto-generated   | Secret key for multi-worker setups.             |
| SHOW\_DIRSIZE   | No       | False            | Display directory sizes.                        |
| MAX\_CACHE (MB) | No       | 256              | RAM limit for video metadata/subtitle cache     |

## File Listing API

When using the API (with the header `Accept: application/json`) the DIR contents will be returned as JSON.
Valid `type` are `disk`, `directory`, `text` and `file` and the extra types are defined in `app/file_types.json`.

**Example of response for /**

```json
[
  {
    "name": "media",
    "path": "/media",
    "type": "directory",
    "mtime": 1750592302.2184954,
    "size": 0
  },
  {
    "name": "something.txt",
    "path": "/something.txt",
    "type": "text",
    "mtime": 1750589251.4473305,
    "size": 9823
  },
  {
    "name": "STORAGE",
    "path": "/STORAGE",
    "type": "disk",
    "capacity": 2147483648000,
    "size": 509872014832,
    "mtime": null
  }
]
```

## Endpoints

* `GET /path?login`
  Returns the login page.
* `POST /path?login`
  Accepts form data (`username`, `password`) to authenticate.
* `GET /path?logout`
  Logs out the current session and redirects to the current page.
* `PUT /dest`
  Uploads a file.
* `GET /path?raw`
  Streams the raw video/audio file; without `?raw`, returns the player page.
* `GET /videopath?subs=index`
  Returns the `index` subtitle track. Add `legacy` to the end to convert SSA→WebVTT.
* `GET /path?sort=XY`
  Sorts directory listing by `X` (n=name, s=size, d=date) and order `Y` (p=ascending, d=descending).

**NOTE**: When using the API (`Accept: application/json`) it ignores the `?sort`, and `?raw` is not necessary as it sends directly the file).

## Other HTTP Methods

The server internally uses some WebDAV methods to handle file and folder operations in a more standard way.    
**Note:** This is not full WebDAV support—these methods are adopted for internal use only.

| Method | Action performed           |
| ------ | -------------------------- |
| DELETE | Delete a file or folder    |
| MKCOL  | Create a new folder        |
| MOVE   | Rename or move an item     |
| COPY   | Duplicate a file or folder |

## HTML vs .web Extensions

Since `.html` files are treated as plain text, the server recognizes `.web` files as HTML pages.

* Placing `index.web` in any folder auto-loads that page instead of the default listing.

**NOTE**: Browser based only (disable with `?noauto`), it does not affect the API.

## Official Plugins

Plugins allow you to create new pages and customize the frontend GUI by dropping `.web` extensions into served directories.    
All the currently available at: [webFILE-plugins](https://github.com/Sergio00166/webFILE-plugins)

## Running the Server

**Development** (Flask builtin, `127.0.0.1:8000`):

```bash
python3 app.py
```

**Production** (WSGI, e.g., Gunicorn):

```bash
gunicorn -b 127.0.0.1:8000 app:app
```

## License

Distributed under the GPL License. See `LICENSE` for details.
