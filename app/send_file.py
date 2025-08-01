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
        if not ranges:
            return Response("Invalid Range", status=416)

        if len(ranges) == 1:
            content_range = f"bytes {ranges[0][0]}-{ranges[-1][1]}/{file_size}"
        else:
            content_range = f"bytes {ranges[0][0]}-{ranges[-1][1]}/{file_size}"

        headers = {
            "Content-Range": content_range,
            "Accept-Ranges": "bytes",
            "Content-Length": str(sum([end - start + 1 for start, end in ranges])),
        }

        if not mimetype is None:
            headers["Content-Type"] = mimetype

        return Response(generate(file_path, ranges), status=206, headers=headers)

    if mimetype is None:
        response = df_send_file(file_path)
    else:
        response = df_send_file(file_path, mimetype=mimetype)

    if cache:
        response.headers["Cache-Control"] = "public, max-age=3600"
    return response


def parse_ranges(range_header, file_size):
    range_match, ranges = RANGE_REGEX.match(range_header), []
    if range_match:
        start = int(range_match.group(1))
        end = range_match.group(2)
        if not end:
            end = file_size - 1
        else:
            end = int(end)
        if start >= file_size or end >= file_size or start > end:
            return None
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

            st = entry.stat(follow_symlinks=True)
            total_size += 512 + ((st.st_size + 511) & ~0x1FF)

            if entry.is_dir(follow_symlinks=True):
                stack.append(path)

    return total_size + 1024


def send_dir(directory, root, ACL, name=None):
    folder = name if name else basename(directory)
    size = safe_calc_tar_size(directory, ACL, root)

    headers={
        "Content-Disposition": "attachment;filename=" + folder+".tar",
        "Content-Length": str(size),
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
    # Create the tar header for the file
    yield create_tar_header(file_path, arcname)
    # Stream file contents from disk
    with open(file_path, "rb") as f:
        while (chunk := f.read(65536)): yield chunk
    # Generate padding for the block
    file_size = getsize(file_path)
    padding_size = (512 - (file_size % 512)) % 512
    yield b"\0" * padding_size


def generate_tar(directory_path):
    root_len = len(directory_path.rstrip(sep)) + 1

    for root, _, files in walk(directory_path, followlinks=True):
        for name in files:
            file_path = join(root, name)
            arcname = file_path[root_len:]
            yield from stream_tar_file(file_path, arcname)

    yield b"\0" * 1024


