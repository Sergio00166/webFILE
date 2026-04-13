# Code by Sergio00166

from os import getenv, makedirs, sep
from os.path import abspath
from sys import path

path.append(abspath(f"{path[0]}{sep}..{sep}app"))
from aml_parser import acl_mgm_engine, onlytext_directive
from json import load as jsload

try: import readline
except: pass


""" EXTRA COMMANDS """

def script_func(_ctx, arg):
    match = onlytext_directive.match(arg)
    if not match: raise SyntaxError

    filename = match.groups()[0]
    try:
        with open(filename, 'r') as f:
            content = "".join(line.strip() for line in f)
    except:
        print(" CANT PROCESS FILE"); return

    for cmd in content.split(";")[:-1]:
        exec_cmd(_ctx, cmd)


""" INITIALIZE AND SET DATA """


USERS, ACL = {}, {}
users_file = getenv('USERS_FILE', None)
acl_file   = getenv('ACL_FILE', None)

if not all((users_file, acl_file)):
    data_dir = abspath(f"{path[0]}{sep}..{sep}data")
    makedirs(data_dir, exist_ok=True)

users_file = users_file or (f"{data_dir}{sep}users.json")
acl_file   = acl_file   or (f"{data_dir}{sep}acl.json")

try:
    tmp = jsload(open(users_file))
    USERS.clear(); USERS.update(tmp)
except: pass

try:
    tmp = jsload(open(acl_file))
    ACL.clear(); ACL.update(tmp)
except: pass


aml_engine = acl_mgm_engine(users_file, acl_file)

aml_engine.ACL.clear()
aml_engine.USERS.clear()

aml_engine.ACL.update(ACL)
aml_engine.USERS.update(USERS)

aml_engine.commands["SOURCE"] = script_func
aml_engine.commands["EXIT"]   = lambda _ctx, arg: exit(0)
aml_engine.commands["CLEAR"]  = lambda _ctx, arg: print("\r\033c", end="");


""" RUN INTERACTIVE """

def cli():
    inp = input(">> ")

    while True:
        while ";" not in inp:
            inp += " " + input("-  ")

        while ";" in inp:
            cmd, _, rest = inp.partition(";")
            if (cmd := cmd.strip()):
                out = aml_engine.run(cmd)
                if out: print(out)
            inp = rest

        if not inp: inp = input(">> ")



if __name__ == "__main__":
    while True:
        try: cli()
        except KeyboardInterrupt: print("")

 
