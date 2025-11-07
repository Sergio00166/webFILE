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
* [🔍 Endpoints](#endpoints)
* [🔢 API Mode](#api-mode)
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
* Extracts embedded subtitles and chapter data from `.mkv`, `.mp4`, etc.
* Auto-loads external `.mks` subtitles matching video basename.

## ACL & User Management

* Managed by `aclmgr.py` in the `app/` directory.
* ACLs define per-path permissions: read-only, write, or denied.
* User accounts stored in JSON (`data/users.json`).
* ACL rules stored in JSON (`data/acl.json`).
* Both files will be loaded onto RAM as an dict.
* See [aclmgr documentation](scripts/aclmgr.md).

## Requirements
### Server-side
```bash
pip install -r requirements.txt
```

Install `ffmpeg` at the system level for media playback.   
A `Redis` sever for session storage and other cache.   

### Client-side

The WEB interface requires a modern browser (2021 or newer).   
If you're using something ancient—like a 2018-era fossil that hasn't seen an update in half a decade—expect broken styles, layout quirks, and a generally degraded experience. 

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

## Endpoints

This server has no endpoints, everything is path‑based with optional query modifiers.  
Exceptions:
- `/path/?login` / `/path/?logout` → Session handling.  
  - Enables login/logout from any path, returning to the same location without extra headers
  - Simplifies GUI flows and supports API usage with status-only responses.
    - `200` → login successful / logout acknowledged.
    - `401` → invalid credentials or not logged in.

- `/?static=path` → for frontend assets
  - Serves files from the given path, used only for GUI.
  - Keeps routing file-centric—no without subendpoints.

### Authentication
- `GET /path?login` → Returns login page.
- `POST /path?login` → Authenticates with `username`, `password`.
- `GET /path?logout` → Logs out and redirects back.

### Media Access
- `GET /path?raw` → Return always the file.
  - Applies only for video and audio files.
  - Send file instead of the player page.
  - Used internally to access media directly from the browser.  
  - Ignored in API mode, files are returned directly.

- `GET /videopath?subs=index` → Get subtitle by index.
  - Applies only for video files.
  - Used internally on video player GUI.
  - Returns subtitle track by its index in SSA format.
  - To use VTT instead of SSA, append the `legacy` suffix to the subtitle index.

- `GET /videopath?tracks` → Get subtitle tracks
  - Applies only for video files.
  - Used internally on video player GUI.
  - Return all subtitle tracks as an JSON list with its names.
  
- `GET /videopath?chapters` → Get chapters
  - Applies only for video files.
  - Used internally on video player GUI.
  - Return all chapters with names and start times as JSON.

### Directory Listing
- `GET /path?sort=XY` → Sorts directory listing by field and order.
  - `X` specifies the sort field: `n` = name, `s` = size, `d` = date.
  - `Y` specifies the sort order: `p` = ascending, `d` = descending.

## API Mode

Set the header `Accept: application/json` to enable API mode.  
In this mode, directory listings are returned as JSON.

**Behavior:**
- `?sort` is ignored — results follow the server’s default order.  
  (Sorting is only used for frontend rendering.)

- Valid `type` values include `disk`, `directory`, `text`, and `file`.  
  Additional types are defined in `app/file_types.json`.

**Example response for `/`:**

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

## Other HTTP Methods

The server internally uses some WebDAV methods to handle file and folder operations.  
**Note:** This is not full WebDAV support—these methods are adopted for internal use only.    

| Method | Action performed           |
| ------ | -------------------------- |
| DELETE | Delete a file or folder    |
| MKCOL  | Create a new folder        |
| MOVE   | Rename or move an item     |
| COPY   | Duplicate a file or folder |
| PUT    | Upload a file              |

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
