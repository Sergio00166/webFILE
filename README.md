# Web Server with Custom Video & Audio Player

A lightweight Python-based HTTP file server with built-in streaming for video and audio. Supports ACL-based access control, uploads, file operations, and extensible via plugins.

## Table of Contents
- [Overview](#overview)  
- [Multimedia Streaming](#multimedia-streaming)  
- [ACL & User Management](#acl--user-management)  
- [Plugins](#plugins)  
- [Requirements](#requirements)  
- [Configuration](#configuration)  
- [Running the Server](#running-the-server)  
- [License](#license)  

## Overview
This service exposes a filesystem directory over HTTP, enabling:  
- **Streaming** of browser-supported video and audio (no transcoding).  
- **File operations**: upload, create, delete (controlled by write ACL).  
- **Access control** via JSON-based ACLs (read/write/deny per resource).  

## Multimedia Streaming
- Leverages browser-native codecs only—no transcoding.  
- Caches metadata and subtitles to minimize `ffmpeg` calls.  
- Switch audio tracks in-browser (requires experimental Web Platform features).  
- SSA/ASS subtitle support via `jassub.js` on the client.  
- On-demand SSA/ASS → WebVTT conversion (toggle in settings).  
- Extracts embedded subs from containers (`.mkv`, `.mp4`, etc.).  
- Auto-loads external subtitle files (`.mks`) with matching basename (disables embedded subs).

## ACL & User Management
- Managed by `aclmgr.py` in the `app/` directory.  
- ACLs define per-path permissions: read-only, write, or denied.  
- Users and groups stored in JSON files.  
- See [aclmgr documentation](aclmgr.md) for usage.

## Plugins
Extend functionality with community plugins:  
https://github.com/Sergio00166/webFILE-plugins

## Requirements
```bash
pip install -r requirements.txt
```  
Install `ffmpeg` at the system level for video playback.

## Configuration
Configure via environment variables (defaults shown):

| Variable       | Required | Default            | Description                                    |
| -------------- | -------- | ------------------ | ---------------------------------------------- |
| SERVE_PATH     | Yes      | —                  | Directory to serve.                            |
| ERRLOG_FILE    | No       | data/error.log     | Path to server error log.                      |
| ACL_FILE       | No       | data/acl.json      | ACL rules file.                                |
| USERS_FILE     | No       | data/users.json    | User account definitions.                      |
| SESSIONS_DB    | No       | data/sessions.db   | Session store.                                 |
| SECRET_KEY     | No       | Auto-generated     | Secret key for multi-worker setups.            |
| SHOW_DIRSIZE   | No       | False              | Display directory size in listings.            |
| MAX_CACHE (MB) | No       | 256                | RAM limit for metadata/subtitle caching/process|

## Running the Server
**Development** (Flask builtin, `127.0.0.1:8000`):
```bash
python3 app.py
```

**Production** (WSGI, e.g., Gunicorn):
```bash
gunicorn -b 0.0.0.0:8000 app:app
```

> If deploying behind NGINX or another reverse proxy, disable POST buffering (e.g., `proxy_request_buffering off;`).

## License
Distributed under the GPL License. See `LICENSE` for details.
