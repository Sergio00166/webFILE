# Code by Sergio00166

from os.path import basename, getmtime, isfile
from os.path import getsize, relpath, join
from flask import send_file as df_send_file
from os import sep, stat, scandir, walk
from re import compile as re_compile
from flask import Response, request
from functions import validate_acl
import tarfile

RANGE_REGEX = re_compile(r"bytes=(\d+)-(\d*)")


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



""" TO SEND FOLDER AS TAR FILES IN REALTIME """

def safe_calc_tar_size(directory, ACL, root):
    total_size, stack = 0, [directory]

    while stack:
        curdir = stack.pop()
        for entry in scandir(curdir):
            path = entry.path
            validate_acl(relpath(path, start=root).replace(sep, "/"), ACL)

            st = entry.stat()
            total_size += 512 + ((st.st_size + 511) & ~0x1FF)
            if entry.is_dir(): stack.append(path)

    return total_size + 1024


def send_dir(directory, root, ACL, name=None):
    folder = name if name else basename(directory)
    size = safe_calc_tar_size(directory, ACL, root)

    headers={
        "Content-Disposition": "attachment;filename=" + folder+".tar",
        "Content-Length": str(size)
    }
    return Response(generate_tar(directory), mimetype="application/x-tar", headers=headers)


def create_tar_header(file_path, arcname):
    tarinfo = tarfile.TarInfo(name=arcname)
    tarinfo.size = getsize(file_path)
    tarinfo.mtime = getmtime(file_path)
    tarinfo.mode = stat(file_path).st_mode
    tarinfo.type = tarfile.REGTYPE
    tarinfo.uname = ""
    tarinfo.gname = ""
    return tarinfo.tobuf()


def stream_tar_file(file_path, arcname):
    yield create_tar_header(file_path, arcname)

    with open(file_path, "rb") as f:
        while (chunk := f.read(65536)): yield chunk

    file_size = getsize(file_path)
    padding_size = (512 - (file_size % 512)) % 512
    yield b"\0" * padding_size


def generate_tar(directory_path):
    root_len = len(directory_path.rstrip(sep)) + 1

    for root, _, files in walk(directory_path):
        for name in files:
            file_path = join(root, name)
            arcname = file_path[root_len:]
            yield from stream_tar_file(file_path, arcname)

    yield b"\0" * 1024

 