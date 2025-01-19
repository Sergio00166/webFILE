#Code by Sergio00166

from functions import validate_acl, safe_path
from werkzeug.formparser\
     import FormDataParser,MultiDict,t,\
            FileStorage,MultiPartParser
from flask import Request
from os import sep, makedirs
from os.path import dirname, exists
from shutil import SameFileError


t_parse_result = tuple[
    t.IO[bytes], MultiDict[str, str],
    MultiDict[str, FileStorage]
]

def custom_stream_factory(
    total_content_length: int | None,
    content_type: str | None,
    filename: str | None,
    content_length: int | None = None,
    parent = None, root = None, ACL = {}
) -> t.IO[bytes]:

    if filename=="": raise NameError
    path = safe_path(parent+sep+filename, root, True)
    if exists(path): raise SameFileError
    validate_acl(parent+"/"+filename, ACL, True)
    makedirs(dirname(path), exist_ok=True)

    return open(path,"wb")



class CustomFormDataParser(FormDataParser):
    
    def set_params(self,ACL,parent,root):
        self.parent = parent
        self.root = root
        self.ACL = ACL

    def _parse_multipart(
        self,
        stream: t.IO[bytes],
        mimetype: str,
        content_length: int | None,
        options: dict[str, str],
    ) -> t_parse_result:

        mod_csf = lambda\
            total_content_length,\
            content_type, filename,\
            content_length\
        : custom_stream_factory(         
            total_content_length, content_type,
            filename, content_length,
            parent = self.parent,
            root = self.root, ACL = self.ACL
        )
        parser = MultiPartParser(
            stream_factory = mod_csf,
            max_form_memory_size=None,
            max_form_parts=None,
            cls=self.cls
        )
        boundary = options.get("boundary", "").encode("ascii")
        if not boundary: raise ValueError("Missing boundary")
        form, files = parser.parse(stream, boundary, content_length)
        return stream, form, files



