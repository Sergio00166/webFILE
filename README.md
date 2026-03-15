# Web Server with Custom Video & Audio Player

A lightweight Python-based HTTP file server.  
Custom video and audio players and a custom photo viewer
Supports ACL‑based access control, uploads, and file operations.

---

## Table of Contents
- [Features](#features)
  - [Overview](#overview)
  - [Multimedia Streaming](#multimedia-streaming)
  - [ACL & User Management](#acl--user-management)
- [Setup](#setup)
  - [Requirements](#requirements)
  - [Configuration](#configuration)
  - [Running the Server](#running-the-server)
- [Usage](#usage)
  - [Endpoints](#endpoints)
    - [Authentication](#authentication)
    - [File Access](#file-access)
    - [Video Access](#video-access)
    - [Directory Listings as JSON](#directory-listings-as-json)
  - [Other HTTP Methods](#other-http-methods)
  - [HTML vs .web Extensions](#html-vs-web-extensions)
  - [Official Plugins](#official-plugins)
- [License](#license)

---

## Features

### Overview
This service exposes a filesystem directory over HTTP, enabling:
- **File operations**: copy/move, rename, upload, create, delete.
- **Streaming**: browser‑native playback using HTTP 206 partial content. No transcoding, no extra overhead.
- **Access control** via in‑memory hashmap‑based ACLs (read/write/deny per resource and user).
- Detects mount points and adjusts directory type (and icon) accordingly.
- Server‑rendered HTML with minimal size.
- Fast directory listing with intelligent caching.
- Fast recursive directory size calculation (disabled by default).

### Multimedia Streaming
- Uses only browser‑native codecs.
- Custom metadata and subtitle cache to reduce `ffmpeg` calls.
- Switch audio tracks directly in the browser (requires experimental Web Platform Features).
- SSA/ASS subtitle support via `JASSUB` on the client.
- On‑demand SSA/ASS → WebVTT conversion when JASSUB fails or is unavailable.
- Extracts embedded subtitles and chapter data from `.mkv`, `.mp4`, and similar formats.
- Auto‑loads external `.mks` subtitles matching the video basename.

### ACL & User Management
- Managed by `aclmgr.py` in the `scripts/` directory.
- ACLs define per‑path permissions: read‑only, write, or deny.
- User accounts stored in JSON, configured via `USERS_FILE`.
- ACL rules stored in JSON, configured via `ACL_FILE`.
- Both files are loaded into RAM as dictionaries.
- The default user (not logged in) is `DEFAULT`.
- See [aclmgr documentation](scripts/aclmgr.md).


## Setup

### Requirements

#### Server-side
```bash
pip install -r requirements.txt
```
- Install `ffmpeg` at the system level for video playback support.
- A `Redis` server is required for session storage and other caching.

#### Client-side
- The web interface requires a modern browser (2021 or newer).
- If you're using something ancient—like a 2018 relic that hasn’t seen an update in half a decade—expect broken styles and layout quirks.

### Configuration
Configure via environment variables:

| Variable      | Required | Default         | Description                |
|---------------|----------|-----------------|----------------------------|
| SERVE_PATH    | Yes      | —               | Directory to serve.        |
| ERRLOG_FILE   | No       | data/error.log  | Server error log.          |
| ACL_FILE      | No       | data/acl.json   | ACL rules file.            |
| USERS_FILE    | No       | data/users.json | User accounts file.        |
| SHOW_DIRSIZE  | No       | False           | Display directory sizes.   |
| REDIS_PORT    | No       | 6379            | Redis port.                |
| REDIS_ADDR    | No       | 127.0.0.1       | Redis host address.        |
| SECRET_KEY    | No       | Auto-generated  | Secret key                 |

### Running the Server
**Development** (Flask builtin, `127.0.0.1:8000`):
```bash
python3 app.py
```

**Production** (WSGI, e.g., Gunicorn):
```bash
gunicorn -b 127.0.0.1:8000 app:app -w $(nproc) -t 900
```

### Important
For production always set the SECRET_KEY, otherwise multi-worker setup will break.  
When deploying with Gunicorn, set an appropriate timeout (`-t`).  
For long‑running file operations such as large downloads or uploads, use a timeout of 30 minutes to 2 hours to prevent premature termination.   
When using NGINX as a reverse proxy, disable post‑buffering and increase proxy_read_timeout to ensure long operations are not interrupted.   

---

## Usage

### Endpoints
This server has no general‑purpose endpoints; everything is path‑based with optional query modifiers.  
The entire `/srv/` namespace is reserved for server functionality.  
No part of `/srv/` can be used as a folder name in the root directory.  
Static files are served from `/srv/static`.

#### Authentication
- `GET /srv/login?redirect=encoded_url` → Returns login page, redirecting after successful login or exit.
- `POST /srv/login` → Authenticates using `username` and `password` (form data).
- `GET /srv/logout` → Logs out and ends the current session.

Responses:
- `200` → login successful / logout acknowledged.
- `401` → invalid credentials or not logged in.

#### File Access
- `GET /path?get=file` → Always returns the file or its file representation.
  - Regular files: returned directly.
  - Overrides the server’s custom MIME handling.
  - Directories: returned as a TAR archive.
  - Useful for bypassing the player page for audio/video.

- `GET /path?get=static` → Returns the file as a static asset.
  - Applies **only to files**.
  - Overrides the server’s custom MIME handling.
  - Uses the same cache headers as `/srv/static/`.
  - Intended for plugin usage.

#### Video Access
- `GET /videopath?get=info` → Provides chapter data, subtitle track details, and adjacent track filenames as JSON.
- `GET /videopath?get=subs_ssa&id=x` → Returns subtitle track `x` in SSA format.
- `GET /videopath?get=subs_vtt&id=x` → Returns subtitle track `x` in VTT format (legacy).

#### Directory Listings as JSON
- `GET /dir_path?get=json` → Retrieve directory listings in JSON format.
- Works **only for directories**.
- Used mainly on main explorer and plugins.

**Behavior:**
- Results follow the server’s default order.
- Valid `type` values: `disk`, `directory`, `text`, `file`.
- Additional types defined in `app/file_types.json`.

**Example response for `/`:**
```json
[
  {
    "name": "media",
    "type": "directory",
    "mtime": 1750592302.2184954,
    "size": 0
  },
  {
    "name": "something.txt",
    "type": "text",
    "mtime": 1750589251.4473305,
    "size": 9823
  },
  {
    "name": "STORAGE",
    "type": "disk",
    "capacity": 2147483648000,
    "size": 509872014832
  }
]
```

### Other HTTP Methods
The server internally uses a subset of WebDAV methods for file/folder operations.  
**Note:** This is not full WebDAV support—these methods are used internally only.

| Method | Action performed           |
|--------|----------------------------|
| DELETE | Delete a file or folder    |
| MKCOL  | Create a new folder        |
| MOVE   | Rename or move an item     |
| COPY   | Duplicate a file or folder |
| PUT    | Upload a file              |

### HTML vs .web Extensions
- `.html` files are treated as plain text.
- `.web` files are recognized as HTML pages.
- Placing `index.web` in any folder auto‑loads that page instead of the default listing.
- Disable with `?get=default` to show the file listing page.

### Official Plugins
Plugins allow creation of new pages and customization of the frontend GUI by dropping `.web` extensions into served directories.  
Available at: [webFILE-plugins](https://github.com/Sergio00166/webFILE-plugins)

---

## License
Distributed under the GPLv3 License. See `LICENSE` for details.

