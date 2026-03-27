# Code by Sergio00166

from os.path import getsize, relpath, join, basename
from flask import send_file as df_send_file
from re import compile as re_compile
from flask import Response, request
from functions import validate_acl
from os import sep, stat, walk
import tarfile

RANGE_REGEX = re_compile(r"bytes=(\d+)-(\d*)")

""" SEND FILE WITH HTTP 206 SUPPORT """

def send_file(file_path, mimetype=None, cache=False):
    file_size = getsize(file_path)
    range_header = request.headers.get("Range")

    if range_header:
        ranges = parse_ranges(range_header, file_size)
        if not ranges: return Response("Invalid Range", status=416)
        headers = {
            "Accept-Ranges": "bytes",
            "Content-Range": f"bytes {ranges[0][0]}-{ranges[-1][1]}/{file_size}",
            "Content-Length": str(sum([end - start + 1 for start, end in ranges])),
        }
        if mimetype: headers["Content-Type"] = mimetype
        return Response(generate(file_path, ranges), status=206, headers=headers)

    response = df_send_file(file_path, mimetype=mimetype)
    if cache: response.headers["Cache-Control"] = "public, max-age=36000"
    return response


def parse_ranges(range_header, file_size):
    range_match, ranges = RANGE_REGEX.match(range_header), []
    if range_match:
        start = int(range_match.group(1))
        end = range_match.group(2)
        end = int(end) if end else file_size - 1

        if not (start <= end < file_size): return
        ranges.append((start, end))
    return ranges


def read_chunk(file, remaining_bytes):
    while remaining_bytes > 0:
        chunk = file.read(min(1024 * 1024, remaining_bytes))
        remaining_bytes -= len(chunk)
        yield chunk


def generate(file_path, ranges):
    with open(file_path, "rb") as file:
        for start, end in ranges:
            file.seek(start)
            remaining_bytes = end - start + 1
            yield from read_chunk(file, remaining_bytes)



""" STREAMING ON-THE-FLY TAR FILE GENERATOR """

def send_dir(directory, root, ACL, name=None):
    folder = name if name else basename(directory)
    size = safe_calc_tar_size(directory, ACL, root)

    headers={
        "Content-Disposition": f"attachment;filename={folder}.tar",
        "Content-Length": str(size)
    }
    return Response(generate_tar(directory), mimetype="application/x-tar", headers=headers)


def safe_calc_tar_size(directory, ACL, root):
    root_len = len(directory.rstrip(sep)) + 1
    size = 0
    for path, st in iter_files(directory):
        rel_path = relpath(path, start=root).replace(sep, "/")
        validate_acl(rel_path, ACL)

        size += len(create_tar_header(path[root_len:], st))
        size += st.st_size + ((512 - (st.st_size % 512)) % 512)
    return size + 1024


def generate_tar(directory):
    root_len = len(directory.rstrip(sep)) + 1
    for path, st in iter_files(directory):
        yield create_tar_header(path[root_len:], st)

        with open(path, "rb") as f:
            while (chunk := f.read(65536)): yield chunk

        yield b"\0" * ((512 - (st.st_size % 512)) % 512)
    yield b"\0" * 1024


def iter_files(directory):
    for root, _, files in walk(directory):
        for name in files:
            path = join(root, name)
            yield path, stat(path)


def create_tar_header(arcname, st):
    tarinfo = tarfile.TarInfo(name=arcname)
    tarinfo.size = st.st_size
    tarinfo.mtime = st.st_mtime
    tarinfo.mode = st.st_mode
    tarinfo.type = tarfile.REGTYPE
    tarinfo.uname = ""
    tarinfo.gname = ""
    return tarinfo.tobuf()


 
