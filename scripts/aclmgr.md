# Command Syntax Documentation for aclmgr.py

## For what this is
This script is used for managing all users and access permissions for the server using the SQL-like commands showed below.

## ALLOW
**Syntax:**
```
ALLOW 'username' TO READ|DOALL ON 'resource'|ALL [DONT INHERIT];
```
Assigns permissions for a user to a specific resource or all resources.
Also allows to disable inheritance, by default (not present) is enabled.

---

## REJECT
**Syntax:**
```
REJECT 'username' ON 'resource'|ALL;
```
Denies permissions for a user on a specific resource or all resources.

---

## DROP
**Syntax:**
```
DROP 'username' FROM 'resource'|ALL;
```
Removes a user from the access control list for a specific resource or all resources.

---

## GET-ACL
**Syntax:**
```
GET-ACL [FOR 'resource'];
```
Retrieves the access control list for a specific resource if specified, else shows all.

---

## ADD-USER
**Syntax:**
```
ADD-USER 'username' PWD 'password';
```
Adds a new user with the specified password.

---

## DEL-USER
**Syntax:**
```
DEL-USER 'username';
```
Deletes a specified user.

---

## GET-USERS
**Syntax:**
```
GET-USERS;
```
Lists all registered users.

---

## COMMIT
**Syntax:**
```
COMMIT;
```
Commits changes made to the system.

---

## FLUSH
**Syntax:**
```
FLUSH ACL|USERS|ALL;
```
Clears the users/ACL database or both.

---

## SOURCE
**Syntax:**
```
SOURCE 'script_path';
```
Executes a script from the specified path.    
I recommend to use the extension .aqs (Acl Query Script)

---

## GET-ENTRIES
**Syntax:**
```
GET-ENTRIES;
```
Retrieves all entries from the access control system.

---

## DEL-ENTRY
**Syntax:**
```
DEL-ENTRY 'resource';
```
Deletes an ACL entry.

---

## ADD-DF-USR
**Syntax:**
```
ADD-DF-USR;
```
Adds the default user for the system.

---

## EXIT
**Syntax:**
```
EXIT;
```
Terminates the application.

---

## CLEAR
**Syntax:**
```
CLEAR;
```
Clears the terminal display.
