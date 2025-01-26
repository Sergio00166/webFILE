#Code by Sergio00166

from re import compile as recompile
from json import load as jsload
from json import dump as jsdump
from os.path import normpath
from hashlib import sha256
from sys import path
from os import sep

try: import readline
except: pass

pdir = sep.join(
    path[0].split(sep)[:-1]
    +["app","extra"]
)
userdb_dir = pdir+sep+"users.json"
acldb_dir  = pdir+sep+"acl.json"
USERS,ACL = {},{}

""" LOAD DATA FROM DISK """
try:
    tmp = jsload(open(userdb_dir))
    USERS.clear(); USERS.update(tmp)
except: pass
try:
    tmp = jsload(open(acldb_dir))
    ACL.clear(); ACL.update(tmp)
except: pass


""" DEFINE REGEX """
allow_directive    = recompile(r"^'([^']+)'\s+TO\s+(READ|DOALL)\s+ON\s+('([^']+)'|ALL)$")
adduser_directive  = recompile(r"^'([^']+)'\s+PWD\s+'([^']+)'$")
getacl_directive   = recompile(r"^FOR\s+'([^']+)'$")
onlytext_directive = recompile(r"^'([^']+)'$")
is_valid_path      = recompile(r"^(/|(/[^\x00/]+)*/?)$")
reject_directive   = recompile(r"^'([^']+)'\s+ON\s+('([^']+)'|ALL)$")
drop_directive     = recompile(r"^'([^']+)'\s+FROM\s+('([^']+)'|ALL)$")
perms     = {"NONE":0, "READ":1, "DOALL":2}
perms_rev = {0:"NONE", 1:"READ", 2:"DOALL"}

""" ACTION FUNCTIONS """

def clean_acl_after_removing_user(ACL,user):
    keys_to_delete = []
    for key, users in ACL.items():
        if user in users:
            del users[user]
            if not users: keys_to_delete.append(key)
    for key in keys_to_delete: del ACL[key]

def commit(args):
    _,ACL,USERS = args
    try:
        with open(userdb_dir, 'w') as file:
            jsdump(USERS, file)
        with open(acldb_dir, 'w') as file:
            jsdump(ACL, file)
    except: print("CANNOT SAVE TO DATABASE")

def allow_func(args):
    arg, ACL, USERS = args
    match = allow_directive.match(arg)
    if not match: raise SyntaxError
    user, permission, _, resource = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return
    if resource is None:  # If is ALL
        for x in ACL.copy():
            allow_func((f"'{user}' TO {permission} ON '{x}'",ACL,USERS))
    else:
        if not is_valid_path.match(resource):
            print(" ACLs KEYs MUST BE A VALID PATH")
            return
        resource = normpath(resource).replace(sep,"/")
        if resource not in ACL: ACL[resource]={}
        ACL[resource][user] = perms[permission]

def reject_func(args):
    arg, ACL, USERS = args
    match = reject_directive.match(arg)
    if not match: raise SyntaxError
    user,_, resource = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return
    if resource is None:  # If is ALL
        for x in ACL.copy():
            reject_func((f"'{user}' ON '{x}'",ACL,USERS))
    else:
        if not is_valid_path.match(resource):
            print(" ACLs KEYs MUST BE A VALID PATH")
            return
        resource = normpath(resource).replace(sep,"/")
        if resource not in ACL:
            ACL[resource]={}
        if user in ACL[resource]:
            del ACL[resource][user]
            if not ACL[resource]: del ACL[resource]
        else: ACL[resource][user] = perms["NONE"]

def drop_usr_from_acl(args):
    arg, ACL, USERS = args
    match = drop_directive.match(arg)
    if not match: raise SyntaxError
    user,_, resource = match.groups()
    if user not in USERS:
        print(" THE USER DOES NOT EXIST")
        return
    if resource is None:  # If is ALL
        for x in ACL.copy():
            drop_usr_from_acl((f"'{user}' FROM '{x}'",ACL,USERS))
    else:
        if resource not in ACL: return
        if user in ACL[resource]:
            del ACL[resource][user]
            if not ACL[resource]: del ACL[resource]   
    
def getacl_func(args):
    arg, ACL, _ = args
    match = getacl_directive.match(arg)
    if not (match or arg==""): raise SyntaxError
    if arg=="":
        lst = [f'-> "{x}"\n'+"\n".join(
              [f' - USER: "{y}"\n   ACCESS: "{perms_rev[ACL[x][y]]}"'
               for y in ACL[x]]) for x in ACL if ACL[x]]
    else:
        acl = ACL.get(match.groups()[0])
        lst = [f'- USER: "{x}"\n  ACCESS: "{perms_rev[acl[x]]}"'
               for x in acl] if acl else []
    if len(lst)!=0:
        print("---------- ACL -----------")
        print("\n".join(lst)+"\n")

def adduser_func(args):
    arg,_,USERS = args
    match = adduser_directive.match(arg)
    if match:
        usr,pwd = match.groups()
        if usr=="DEFAULT":
            print(" CANNOT CREATE THE DEFAULT USER ENTITY")
            print(" USE THE VERB ADD-DF-USR INSTEAD")
            return
        h = sha256()
        h.update(pwd.encode())
        pwd = h.hexdigest()
        USERS[usr] = pwd
    else: raise SyntaxError

def deluser_func(args):
    arg,ACL,USERS = args
    match = onlytext_directive.match(arg)
    if match:
        usr = match.groups()[0]
        if usr in USERS:
            del USERS[usr]
            clean_acl_after_removing_user(ACL,usr)
        else: print(" THAT USER DOES NOT EXIST")
    else: raise SyntaxError

def showusers_func(args):
    arg,_,USERS = args
    if len(USERS)>0:
        print("--------- USERS ----------")
        print("\n".join([x for x in USERS])+"\n")

def flush_func(args):
    arg,ACL,USERS = args
    if arg=="ACL":
        for x in ACL.copy():   del ACL[x]
    elif arg=="USERS":
        for x in USERS.copy(): del USERS[x]
    elif arg=="ALL":
        for x in ACL.copy():   del ACL[x]
        for x in USERS.copy(): del USERS[x]
    else: print(" INVALID OPTION")

def script_func(args):
    arg,ACL,USERS = args
    match = onlytext_directive.match(arg)
    if match:
        arg = match.groups()[0]
        script = ""
        try:
            with open(arg, 'r') as file:
                script = ""
                for x in file.readlines():
                    script += x.strip()
        except: print(" CANT PROCESS FILE")
        for x in script.split(";")[:-1]:
            exec_cmd(x)
    else: raise SyntaxError

def getentries_func(args):
    _,ACL,_ = args
    lst = [f"-> {x}" for x in ACL]
    if len(lst)!=0:
        print("---------- ACL -----------")
        print("\n".join(lst)+"\n")

def delentry_func(args):
    arg,ACL,_ = args
    match = onlytext_directive.match(arg)
    if match:
        entry = match.groups()[0]
        if entry in ACL: del ACL[entry]
        else: print(" ACL ENTRY DOES NOT EXIST")
    else: raise SyntaxError

def adddefaultuser(args):
    _,_,USERS = args
    USERS["DEFAULT"] = None



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
    "EXIT":        lambda arg: exit(0),
    "CLEAR":       lambda arg: print("\r\033c",end=""),
}

def exec_cmd(arg):
    arg = arg.strip()
    if arg.startswith("#"): return
    idx = arg.find(" ")
    if idx>0:
        cmd  = arg[:idx]
        args = arg[idx+1:].lstrip()
    else: cmd,args = arg,""   
    cmd = commands.get(cmd)
    if cmd is not None:
        try: cmd((args,ACL,USERS))
        except SyntaxError: print(" SYNTAX ERROR")
    else: print(" INVALID COMMAND")


def cli():
    inp = input(">> ")
    while True:
        if ";" in inp:
            if inp.endswith(";"):
                cmds = inp[:-1].split(";")
                for x in cmds: exec_cmd(x)
                inp = input(">> ")
            else:
                idx = inp.find(";")
                exec_cmd(inp[:idx-1])
                inp = inp[idx+1:]
        else: inp += " "+input("-  ")

def main():
    while True:
        try: cli()
        except KeyboardInterrupt:
            print("")


if __name__=="__main__": main()

