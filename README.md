
# Web Server with Custom Video & Audio Player

A lightweight Python-based HTTP file server with built-in streaming for video and audio.  
Supports ACL-based access control, uploads, and file operations.

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
    - [Directory Listing](#directory-listing)
    - [Directory Listings as JSON](#directory-listings-as-json)
  - [Other HTTP Methods](#other-http-methods)
  - [HTML vs .web Extensions](#html-vs-web-extensions)
  - [Official Plugins](#official-plugins)
- [License](#license)

---

## Features

### Overview
This service exposes a filesystem directory over HTTP, enabling:
- **File operations**: upload, create, delete.
- **Streaming**: streaming via browser-supported formats using HTTP 206. No transcoding, no overhead.
- **Access control** via on-memory hashmap-based ACLs (read/write/deny per resource and user).
- Detects if a directory is a mount point and changes its type (and icon).
- Fast recursive directory size calculation with custom caching system (disabled by default).

### Multimedia Streaming
- Leverages browser-native codecs only.
- Custom cache system for metadata and subtitles to minimize `ffmpeg` calls.
- Switch audio tracks in-browser (requires experimental Web Platform Features).
- SSA/ASS subtitle support via `JASSUB` on the client.
- On-demand SSA/ASS → WebVTT conversion, used when JASSUB does not render or fails.
- Extracts embedded subtitles and chapter data from `.mkv`, `.mp4`, etc.
- Auto-loads external `.mks` subtitles matching video basename.

### ACL & User Management
- Managed by `aclmgr.py` in the `app/` directory.
- ACLs define per-path permissions: read-only, write, or denied.
- User accounts stored in JSON (`data/users.json`).
- ACL rules stored in JSON (`data/acl.json`).
- Both files loaded into RAM as a dictionary.
- See [aclmgr documentation](scripts/aclmgr.md).

---

## Setup

### Requirements

#### Server-side
```bash
pip install -r requirements.txt
```
- Install `ffmpeg` at the system level for media playback.  
- A `Redis` server for session storage and other cache.  

#### Client-side
- The web interface requires a modern browser (2021 or newer).  
- If you're using something ancient, like a 2018-era fossil that hasn't seen an update in half a decade, expect broken styles and layout quirks.      

### Configuration
Configure via environment variables:

| Variable      | Required | Default        | Description                          |
|---------------|----------|----------------|--------------------------------------|
| SERVE_PATH    | Yes      | —              | Directory to serve.                  |
| ERRLOG_FILE   | No       | data/error.log | Server error log.                    |
| ACL_FILE      | No       | data/acl.json  | ACL rules file.                      |
| USERS_FILE    | No       | data/users.json| User accounts file.                  |
| SECRET_KEY    | No       | Auto-generated | Secret key for multi-worker setups.  |
| SHOW_DIRSIZE  | No       | False          | Display directory sizes.             |

### Running the Server
**Development** (Flask builtin, `127.0.0.1:8000`):
```bash
python3 app.py
```

**Production** (WSGI, e.g., Gunicorn):
```bash
gunicorn -b 127.0.0.1:8000 app:app
```

---

## Usage

### Endpoints
This server has no general-purpose endpoints; everything is path-based with optional query modifiers.  
The entire `/srv/` namespace is reserved for server functionality.  
No part of `/srv/` can be used as a folder name in the root directory.

#### Authentication
- `GET /srv/login?redirect=encoded_url` → Returns login page, redirecting after successful login or exit.  
- `POST /srv/login` → Authenticates with `username`, `password`.  
- `GET /srv/logout` → Logs out and ends session.  

Responses:
- `200` → login successful / logout acknowledged.  
- `401` → invalid credentials or not logged in.  

#### File Access
- `GET /path?get=file` → Always return the file or its representation.  
  - Regular files: returns the file directly.  
  - Directories: returns a TAR archive of contents.  
  - Useful to avoid player page for audio/video.  

- `GET /path?get=cached` → Return the file with cache headers.  
  - Applies **only to files**.  
  - Uses same cache headers as `/srv/static/`.  
  - Intended for plugin usage.  

#### Video Access
- `GET /videopath?get=chapters` → Get chapters (JSON).  
- `GET /videopath?get=tracks` → Get subtitle tracks (JSON list).  
- `GET /videopath?get=subs_ssa&id=x` → Get subtitle track by ID in SSA format.  
- `GET /videopath?get=subs_vtt&id=x` → Get subtitle track by ID in VTT format (legacy).  

#### Directory Listing
- `GET /path?sort=XY` → Sorts directory listing by field and order.  
  - `X`: sort field → `n` = name, `s` = size, `d` = date.  
  - `Y`: sort order → `p` = ascending, `d` = descending.  

#### Directory Listings as JSON
- `GET /dir_path?get=json` → Retrieve directory listings in JSON format.  
- Works **only for directories**.  
- Sorting parameter ignored.  

**Behavior:**
- Results follow server’s default order.  
- Valid `type` values: `disk`, `directory`, `text`, `file`.  
- Additional types defined in `app/file_types.json`.  

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

### Other HTTP Methods
The server internally uses some WebDAV methods for file/folder operations.  
**Note:** This is not full WebDAV support—methods are adopted for internal use only.  

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
- Placing `index.web` in any folder auto-loads that page instead of default listing.  
- Disable with `?get=explorer` to get file listing page.  

### Official Plugins
Plugins allow creation of new pages and customization of the frontend GUI by dropping `.web` extensions into served directories.  
Available at: [webFILE-plugins](https://github.com/Sergio00166/webFILE-plugins)

---

## License
Distributed under the GPLv3 License. See `LICENSE` for details.
