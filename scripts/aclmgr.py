# Code by Sergio00166

from os.path import normpath, abspath
from os import sep, getenv, makedirs
from re import compile as recompile
from json import load as jsload, dump as jsdump
from hashlib import sha256
from sys import path

try: import readline
except: pass

users_file = getenv('USERS_FILE', None)
acl_file   = getenv('ACL_FILE', None)
USERS, ACL = {}, {}

if not all((users_file, acl_file)):
    parent_path = abspath(path[0] + sep + "..") + sep
    data_dir    = parent_path + sep + "data" + sep
    makedirs(data_dir, exist_ok=True)

users_file = users_file or (data_dir + "users.json")
acl_file   = acl_file   or (data_dir + "acl.json")


""" LOAD DATA FROM DISK """
try:
    tmp = jsload(open(users_file))
    USERS.clear()
    USERS.update(tmp)
except: pass

try:
    tmp = jsload(open(acl_file))
    ACL.clear()
    ACL.update(tmp)
except: pass


""" DEFINE REGEX """

allow_directive    = recompile(
    r"^'([^']+)'\s+TO\s+(READ|DOALL)\s+ON\s+('([^']+)'|ALL)(?:\s+(DONT INHERIT))?$"
)
adduser_directive  = recompile(r"^'([^']+)'\s+PWD\s+'([^']+)'$")
getacl_directive   = recompile(r"^FOR\s+'([^']+)'$")
onlytext_directive = recompile(r"^'([^']+)'$")
reject_directive   = recompile(r"^'([^']+)'\s+ON\s+('([^']+)'|ALL)$")
drop_directive     = recompile(r"^'([^']+)'\s+FROM\s+('([^']+)'|ALL)$")
is_valid_path      = recompile(r"^(/|(/[^\x00/]+)*/?)$")
perms              = {"NONE": 0, "READ": 1, "DOALL": 2}
perms_rev          = {0: "NONE", 1: "READ", 2: "DOALL"}


""" ACTION FUNCTIONS """

def clean_acl_after_removing_user(ACL, user):
    keys_to_delete = []
    for key, users in ACL.items():
        if user in users:
            del users[user]
            if not users:
                keys_to_delete.append(key)
    for key in keys_to_delete:
        del ACL[key]

def commit(args):
    _, ACL, USERS = args
    try:
        with open(users_file, 'w') as f:
            jsdump(USERS, f)
        with open(acl_file, 'w') as f:
            jsdump(ACL, f)
    except:
        print("CANNOT SAVE TO DATABASE")

def allow_func(args):
    arg, ACL, USERS = args
    match = allow_directive.match(arg)
    if not match:
        raise SyntaxError
    user, permission, _, resource, dont_inherit = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return

    # If resource is ALL: recurse for every existing ACL entry
    if resource is None:
        for x in list(ACL.keys()):
            extra = " DONT INHERIT" if dont_inherit else ""
            allow_func((f"'{user}' TO {permission} ON '{x}'{extra}", ACL, USERS))
        return

    # Single resource
    if not is_valid_path.match(resource):
        print(" ACLs KEYS MUST BE A VALID PATH")
        return

    normalized = normpath(resource).replace(sep, "/")
    if normalized not in ACL:
        ACL[normalized] = {}

    ACL[normalized][user] = {
        "access": perms[permission],
        "inherit": (dont_inherit is None)
    }

def reject_func(args):
    arg, ACL, USERS = args
    match = reject_directive.match(arg)
    if not match:
        raise SyntaxError
    user, _, resource = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return

    if resource is None:
        for x in list(ACL.keys()):
            reject_func((f"'{user}' ON '{x}'", ACL, USERS))
        return

    if not is_valid_path.match(resource):
        print(" ACLs KEYS MUST BE A VALID PATH")
        return

    normalized = normpath(resource).replace(sep, "/")
    if normalized not in ACL:
        ACL[normalized] = {}

    ACL[normalized][user] = {
        "access": perms["NONE"],
        "inherit": True
    }

def drop_usr_from_acl(args):
    arg, ACL, USERS = args
    match = drop_directive.match(arg)
    if not match:
        raise SyntaxError
    user, _, resource = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return

    if resource is None:
        for x in list(ACL.keys()):
            drop_usr_from_acl((f"'{user}' FROM '{x}'", ACL, USERS))
        return

    normalized = normpath(resource).replace(sep, "/")
    if normalized not in ACL:
        return
    if user in ACL[normalized]:
        del ACL[normalized][user]
        if not ACL[normalized]:
            del ACL[normalized]

def getacl_func(args):
    arg, ACL, _ = args
    match = getacl_directive.match(arg)
    if not (match or arg == ""):
        raise SyntaxError

    lines = []
    if arg == "":
        # Show all entries
        for path_entry, users in ACL.items():
            entries = []
            for u, info in users.items():
                perm_str = perms_rev[info["access"]]
                inh_str  = "YES" if info["inherit"] else "NO"
                entries.append(f' - USER: "{u}"\n   ACCESS: "{perm_str}"\n   INHERIT: "{inh_str}"')
            block = f'-> "{path_entry}"\n' + "\n".join(entries)
            lines.append(block)
    else:
        path_key = match.groups()[0]
        acl_entry = ACL.get(path_key, {})
        for u, info in acl_entry.items():
            perm_str = perms_rev[info["access"]]
            inh_str  = "YES" if info["inherit"] else "NO"
            lines.append(f'- USER: "{u}"\n  ACCESS: "{perm_str}"\n  INHERIT: "{inh_str}"')

    if lines:
        print("---------- ACL -----------")
        print("\n".join(lines) + "\n")

def adduser_func(args):
    arg, _, USERS = args
    match = adduser_directive.match(arg)
    if not match:
        raise SyntaxError
    usr, pwd = match.groups()
    if usr == "DEFAULT":
        print(" CANNOT CREATE THE DEFAULT USER ENTITY")
        print(" USE THE VERB ADD-DF-USR INSTEAD")
        return
    h = sha256()
    h.update(pwd.encode())
    USERS[usr] = h.hexdigest()

def deluser_func(args):
    arg, ACL, USERS = args
    match = onlytext_directive.match(arg)
    if not match:
        raise SyntaxError
    usr = match.groups()[0]
    if usr in USERS:
        del USERS[usr]
        clean_acl_after_removing_user(ACL, usr)
    else:
        print(" THAT USER DOES NOT EXIST")

def showusers_func(args):
    arg, _, USERS = args
    if USERS:
        print("--------- USERS ----------")
        for u in USERS: print(u)
        print()

def flush_func(args):
    arg, ACL, USERS = args
    if arg == "ACL":
        ACL.clear()
    elif arg == "USERS":
        USERS.clear()
    elif arg == "ALL":
        ACL.clear()
        USERS.clear()
    else:
        print(" INVALID OPTION")

def script_func(args):
    arg, ACL, USERS = args
    match = onlytext_directive.match(arg)
    if not match:
        raise SyntaxError
    filename = match.groups()[0]
    try:
        with open(filename, 'r') as f:
            content = "".join(line.strip() for line in f)
    except:
        print(" CANT PROCESS FILE")
        return

    for cmd in content.split(";")[:-1]:
        exec_cmd(cmd)

def getentries_func(args):
    _, ACL, _ = args
    if ACL:
        print("---------- ACL -----------")
        for path_entry in ACL:
            print(f"-> {path_entry}")
        print()

def delentry_func(args):
    arg, ACL, _ = args
    match = onlytext_directive.match(arg)
    if not match:
        raise SyntaxError
    entry = match.groups()[0]
    if entry in ACL:
        del ACL[entry]
    else:
        print(" ACL ENTRY DOES NOT EXIST")

def adddefaultuser(args):
    _, _, USERS = args
    USERS["DEFAULT"] = None

def export_acl(args):
    _, ACL, _ = args
    lines = ["----- Exporting ACL ------", "FLUSH ACL;"]
    for path_entry, users in ACL.items():
        for u, info in users.items():
            access_str = perms_rev[info["access"]]
            inh_str = " DONT INHERIT" if not info["inherit"] else ""
            if access_str == "NONE":
                lines.append(f"REJECT '{u}' ON '{path_entry}';")
            else:
                lines.append(f"ALLOW '{u}' TO {access_str} ON '{path_entry}'{inh_str};")
    print("\n".join(lines) + "\n")


""" MAIN USER INPUT BLOCK """

commands = {
    "ALLOW":       allow_func,
    "REJECT":      reject_func,
    "DROP":        drop_usr_from_acl,
    "GET-ACL":     getacl_func,
    "ADD-USER":    adduser_func,
    "DEL-USER":    deluser_func,
    "GET-USERS":   showusers_func,
    "COMMIT":      commit,
    "FLUSH":       flush_func,
    "SOURCE":      script_func,
    "GET-ENTRIES": getentries_func,
    "DEL-ENTRY":   delentry_func,
    "ADD-DF-USR":  adddefaultuser,
    "EXPORT-ACL":  export_acl,
    "EXIT":        lambda arg: exit(0),
    "CLEAR":       lambda arg: print("\r\033c", end=""),
}

def exec_cmd(arg):
    arg = arg.strip()
    if arg.startswith("#"):
        return
    idx = arg.find(" ")
    if idx > 0:
        cmd  = arg[:idx]
        rest = arg[idx+1:].lstrip()
    else:
        cmd, rest = arg, ""
    func = commands.get(cmd)
    if func:
        try:
            func((rest, ACL, USERS))
        except SyntaxError:
            print(" SYNTAX ERROR")
    else:
        print(" INVALID COMMAND")

def cli():
    inp = input(">> ")
    while True:
        if ";" in inp:
            if inp.endswith(";"):
                cmds = inp[:-1].split(";")
                for c in cmds:
                    exec_cmd(c)
                inp = input(">> ")
            else:
                idx = inp.find(";")
                exec_cmd(inp[:idx])
                inp = inp[idx+1:]
        else:
            inp += " " + input("-  ")


def main():
    while True:
        try: cli()
        except KeyboardInterrupt:
            print("")

if __name__ == "__main__":  main()

