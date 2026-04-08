# Code by Sergio00166

from re import compile as recompile
from types import SimpleNamespace
from json import dump as jsdump
from os.path import normpath
from hashlib import sha256
from os import sep


######################################################
#   Regex and constants
######################################################

allow_directive    = recompile(r"^'([^']+)'\s+TO\s+(READ|DOALL)\s+ON\s+('([^']+)'|ALL)(?:\s+(DONT INHERIT))?$")
adduser_directive  = recompile(r"^'([^']+)'\s+PWD\s+'([^']+)'$")
getacl_directive   = recompile(r"^FOR\s+'([^']+)'$")
onlytext_directive = recompile(r"^'([^']+)'$")
reject_directive   = recompile(r"^'([^']+)'\s+ON\s+('([^']+)'|ALL)$")
drop_directive     = recompile(r"^'([^']+)'\s+FROM\s+('([^']+)'|ALL)$")
is_valid_path      = recompile(r"^(/|(/[^\x00/]+)*/?)$")

perms              = {"NONE": 0, "READ": 1, "DOALL": 2}
perms_rev          = {0: "NONE", 1: "READ", 2: "DOALL"}


######################################################
#   Utils and tools
######################################################

def clean_acl_after_removing_user(_ctx, user):
    to_delete = []
    for path, users in _ctx.ACL.items():
        if user in users:
            del users[user]
            if not users: to_delete.append(path)
    for p in to_delete: del _ctx.ACL[p]


def commit(_ctx, arg):
    try:
        with open(_ctx.users_file, "w") as f: jsdump(_ctx.USERS, f)
        with open(_ctx.acl_file,  "w") as f: jsdump(_ctx.ACL, f)
        return ""
    except: return "CANNOT SAVE TO DATABASE"


def flush_func(_ctx, arg):
    arg = arg.strip()
    if arg == "ACL":     _ctx.ACL.clear()
    elif arg == "USERS": _ctx.USERS.clear()
    elif arg == "ALL":   _ctx.ACL.clear(); _ctx.USERS.clear()
    else:                return " INVALID OPTION"
    return ""


def export_acl(_ctx, arg):
    lines = ["----- Exporting ACL ------"]
    for path, users in _ctx.ACL.items():
        for u, info in users.items():
            access = perms_rev[info["access"]]
            inh = " DONT INHERIT" if not info["inherit"] else ""

            if access == "NONE":
                lines.append(f"REJECT '{u}' ON '{path}';")
            else:
                lines.append(f"ALLOW '{u}' TO {access} ON '{path}'{inh};")
    return "\n".join(lines) + "\n"


######################################################
#   base ACL management
######################################################

def allow_func(_ctx, arg):
    m = allow_directive.match(arg)
    if not m: raise SyntaxError

    user, perm, _, resource, dont_inherit = m.groups()
    if user not in _ctx.USERS:
        return " THE USER DOES NOT EXIST"

    if resource is None:
        msgs = []
        for p in list(_ctx.ACL.keys()):
            extra = " DONT INHERIT" if dont_inherit else ""
            msg = allow_func(_ctx, f"'{user}' TO {perm} ON '{p}'{extra}")
            if msg: msgs.append(msg)
        return "\n".join(msgs)

    if not is_valid_path.match(resource):
        return " ACLs KEYS MUST BE A VALID PATH"

    norm = normpath(resource).replace(sep, "/")
    _ctx.ACL.setdefault(norm, {})
    _ctx.ACL[norm][user] = {
        "access": perms[perm],
        "inherit": (dont_inherit is None)
    }
    return ""


def reject_func(_ctx, arg):
    m = reject_directive.match(arg)
    if not m: raise SyntaxError

    user, _, resource = m.groups()
    if user not in _ctx.USERS:
        return " THE USER DOES NOT EXIST"

    if resource is None:
        msgs = []
        for p in list(_ctx.ACL.keys()):
            msg = reject_func(_ctx, f"'{user}' ON '{p}'")
            if msg: msgs.append(msg)
        return "\n".join(msgs)

    if not is_valid_path.match(resource):
        return " ACLs KEYS MUST BE A VALID PATH"

    norm = normpath(resource).replace(sep, "/")
    _ctx.ACL.setdefault(norm, {})
    _ctx.ACL[norm][user] = {"access": perms["NONE"], "inherit": True}
    return ""


######################################################
#   extra ACL management
######################################################

def drop_user_from_acl(_ctx, arg):
    m = drop_directive.match(arg)
    if not m: raise SyntaxError

    user, _, resource = m.groups()
    if user not in _ctx.USERS:
        return " THE USER DOES NOT EXIST"

    if resource is None:
        msgs = []
        for p in list(_ctx.ACL.keys()):
            msg = drop_user_from_acl(_ctx, f"'{user}' FROM '{p}'")
            if msg: msgs.append(msg)
        return "\n".join(msgs)

    norm = normpath(resource).replace(sep, "/")
    if norm in _ctx.ACL and user in _ctx.ACL[norm]:
        del _ctx.ACL[norm][user]
        if not _ctx.ACL[norm]: del _ctx.ACL[norm]
    return ""


def delEntry_func(_ctx, arg):
    m = onlytext_directive.match(arg)
    if not m: raise SyntaxError

    entry = m.group(1)
    if entry in _ctx.ACL:
        del _ctx.ACL[entry]
        return ""
    return " ACL ENTRY DOES NOT EXIST"


######################################################
#   ACL info listing
######################################################

def getACL_func(_ctx, arg):
    m = getacl_directive.match(arg)
    if not (m or arg == ""): raise SyntaxError

    lines = []
    if arg == "":
        for path, users in _ctx.ACL.items():
            block = [f'-> "{path}"']
            for u, info in users.items():
                block.append(
                    f' - USER: "{u}"\n'
                    f'   ACCESS: "{perms_rev[info["access"]]}"\n'
                    f'   INHERIT: "{"YES" if info["inherit"] else "NO"}"'
                )
            lines.append("\n".join(block))
    else:
        key = m.group(1)
        for u, info in _ctx.ACL.get(key, {}).items():
            lines.append(
                f'- USER: "{u}"\n'
                f'  ACCESS: "{perms_rev[info["access"]]}"\n'
                f'  INHERIT: "{"YES" if info["inherit"] else "NO"}"'
            )

    if not lines: return ""
    return "---------- ACL -----------\n" + "\n\n".join(lines) + "\n"


def getEntries_func(_ctx, arg):
    if not _ctx.ACL: return ""
    lines = ["---------- ACL -----------"]
    lines.extend(f"-> {p}" for p in _ctx.ACL)
    return "\n".join(lines) + "\n"


######################################################
#   Users management
######################################################

def addUser_func(_ctx, arg):
    m = adduser_directive.match(arg)
    if not m: raise SyntaxError

    user, pwd = m.groups()
    if user == "DEFAULT":
        return (
            " CANNOT CREATE THE DEFAULT USER ENTITY\n"
            " USE THE VERB ADD-DF-USER INSTEAD"
        )
    h = sha256()
    h.update(pwd.encode())
    _ctx.USERS[user] = {"hash": h.hexdigest(), "admin": False}
    return ""


def delUser_func(_ctx, arg):
    m = onlytext_directive.match(arg)
    if not m: raise SyntaxError

    user = m.group(1)
    if user not in _ctx.USERS:
        return " THAT USER DOES NOT EXIST"
  
    del _ctx.USERS[user]
    clean_acl_after_removing_user(_ctx, user)
    return ""


def addDefaultUser(_ctx, arg):
    _ctx.USERS["DEFAULT"] = {"hash": None, "admin": False}
    return ""


######################################################
#   Admin management
######################################################

def _admin_target(_ctx, arg):
    m = onlytext_directive.match(arg)
    if not m: raise SyntaxError

    user = m.group(1)
    if user not in _ctx.USERS:
        return None, " THAT USER DOES NOT EXIST"

    if user == "DEFAULT":
        return None, (
            " ADMIN ROLE DOES NOT APPLY\n"
            " TO THE DEFAULT USER ENTITY"
        )
    return user, ""


def addAdmin_func(_ctx, arg):
    user, msg = _admin_target(_ctx, arg)
    if user is None: return msg
    _ctx.USERS[user]["admin"] = True
    return ""


def revokeAdmin_func(_ctx, arg):
    user, msg = _admin_target(_ctx, arg)
    if user is None: return msg
    _ctx.USERS[user]["admin"] = False
    return ""


######################################################
#   User info listing
######################################################

def getUsers_func(_ctx, arg):
    if not _ctx.USERS: return ""
    lines = ["---------- USERS -----------"]
    lines.extend(_ctx.USERS.keys())
    return "\n".join(lines) + "\n"


def whichAdmin_func(_ctx, arg):
    admins = [u for u in _ctx.USERS if _ctx.USERS[u]["admin"]]
    if not admins: return ""
    lines = ["------ ADMINISTRATORS ------"]
    lines.extend(admins)
    return "\n".join(lines) + "\n"


######################################################
#   Engine class
######################################################

class acl_mgm_engine:
    
    @property
    def USERS(self): return self._ctx.USERS

    @property
    def ACL(self): return self._ctx.ACL
    
    def __init__(self, users_file, acl_file):
        self._ctx = SimpleNamespace(
            USERS = {},  ACL = {},
            users_file = users_file,
            acl_file = acl_file
        )
        self.commands = {
            "ALLOW":        allow_func,
            "REJECT":       reject_func,
            "DROP":         drop_user_from_acl,
            "GET-ACL":      getACL_func,
            "ADD-USER":     addUser_func,
            "DEL-USER":     delUser_func,
            "GET-USERS":    getUsers_func,
            "WHICH-ADMIN":  whichAdmin_func,
            "COMMIT":       commit,
            "FLUSH":        flush_func,
            "GET-ENTRIES":  getEntries_func,
            "DEL-ENTRY":    delEntry_func,
            "ADD-DF-USER":  addDefaultUser,
            "EXPORT-ACL":   export_acl,
            "ADD-ADMIN":    addAdmin_func,
            "REVOKE-ADMIN": revokeAdmin_func,
        }

    def run(self, command_string):
        arg = command_string.strip()
        if not arg or arg.startswith("#"): return ""

        if " " in arg:
            cmd, rest = arg.split(" ", 1)
            rest = rest.lstrip()
        else:
            cmd, rest = arg, ""

        func = self.commands.get(cmd)
        if not func: return " INVALID COMMAND"

        try: out = func(self._ctx, rest)
        except SyntaxError: return " SYNTAX ERROR"
        return out or ""


 