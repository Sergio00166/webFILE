# ACL Manager Command Language

This document describes the interactive command language accepted by `aclmgr.py`.

## Overview

Each command is entered as a statement and terminated with `;`.

The parser splits input using semicolons, so you can type one command per line or multiple commands in a single line.

Example:

```text
ADD-DF-USER;
ADD-USER 'alice' PWD 'secret';
ALLOW 'alice' TO DOALL ON '/srv';
GET-ACL;
````

## General Rules

* Commands are case-sensitive.
* Command names use hyphenated uppercase spelling, such as `GET-ACL` and `ADD-USER`.
* String values must be enclosed in single quotes: `'example'`.
* Comments start with `#` and are ignored only when the line begins with `#`.
* Paths are normalized internally.
* Resource paths must be valid absolute paths when a command expects a path.
* `ALL` can be used in some commands to target every existing ACL entry.

## Resources and Paths

A resource is usually an absolute path such as:

```text
'/'
'/home'
'/home/docs'
'/var/log/'
```

The parser accepts paths that follow Unix-style absolute path rules. Internally, equivalent paths may be normalized to the same stored form.

---

# Commands

## ALLOW

Grants a user access to a resource.

```text
ALLOW 'username' TO READ|DOALL ON 'resource'|ALL [DONT INHERIT];
```

### Meaning

* `READ` gives read permission.
* `DOALL` gives full access.
* `ALL` applies the same rule to every existing ACL entry.
* `DONT INHERIT` disables inheritance for that ACL entry.

### Examples

```text
ALLOW 'alice' TO READ ON '/documents';
ALLOW 'admin' TO DOALL ON '/srv' DONT INHERIT;
ALLOW 'bob' TO READ ON ALL;
```

---

## REJECT

Explicitly denies access for a user on a resource.

```text
REJECT 'username' ON 'resource'|ALL;
```

### Meaning

* Sets the user’s access level to `NONE`.
* `ALL` applies the denial to every existing ACL entry.

### Examples

```text
REJECT 'guest' ON '/secret';
REJECT 'guest' ON ALL;
```

---

## DROP

Removes a user from an ACL entry.

```text
DROP 'username' FROM 'resource'|ALL;
```

### Meaning

* Deletes the user’s ACL record for the given resource.
* `ALL` removes that user from every stored ACL entry.

### Examples

```text
DROP 'alice' FROM '/documents';
DROP 'bob' FROM ALL;
```

---

## GET-ACL

Shows ACL information.

```text
GET-ACL;
GET-ACL FOR 'resource';
```

### Meaning

* Without `FOR`, it prints all ACL entries.
* With `FOR 'resource'`, it prints only that resource.

### Examples

```text
GET-ACL;
GET-ACL FOR '/documents';
```

---

## ADD-USER

Creates a new user with a password.

```text
ADD-USER 'username' PWD 'password';
```

### Meaning

* The password is stored as a SHA-256 hash.
* The special user name `DEFAULT` cannot be created with this command.

### Example

```text
ADD-USER 'alice' PWD 'secret';
```

---

## DEL-USER

Deletes a user and removes that user from all ACL entries.

```text
DEL-USER 'username';
```

### Example

```text
DEL-USER 'alice';
```

---

## GET-USERS

Lists all registered users.

```text
GET-USERS;
```

---

## WHICH-ADMIN

Lists all users in the admin group.

```text
WHICH-ADMIN;
```

---

## COMMIT

Saves the current users and ACL data to the configured database files.

```text
COMMIT;
```

---

## FLUSH

Clears stored data from memory.

```text
FLUSH ACL|USERS|ALL;
```

### Meaning

* `ACL` clears all ACL entries.
* `USERS` clears all users.
* `ALL` clears both users and ACL data.

### Examples

```text
FLUSH ACL;
FLUSH USERS;
FLUSH ALL;
```

---

## SOURCE

Executes a script file.

```text
SOURCE 'script_path';
```

### Notes

* Intended for batch execution.
* `.aml` is the recommended extension for ACL Management Language files.

### Example

```text
SOURCE 'setup.aml';
```

---

## EXPORT-ACL

Prints the ACL as `ALLOW` and `REJECT` statements that can be used to recreate the current rules.

```text
EXPORT-ACL;
```

---

## GET-ENTRIES

Lists all ACL resource entries currently stored.

```text
GET-ENTRIES;
```

---

## DEL-ENTRY

Deletes a complete ACL entry for a resource.

```text
DEL-ENTRY 'resource';
```

### Example

```text
DEL-ENTRY '/documents';
```

---

## ADD-DF-USER

Creates the default system user named `DEFAULT`.

```text
ADD-DF-USER;
```

### Notes

* `DEFAULT` is a special built-in user entity.
* It cannot be created with `ADD-USER`.

---

## ADD-ADMIN

Adds an existing user to the admin group.

```text
ADD-ADMIN 'user';
```

### Example

```text
ADD-ADMIN 'alice';
```

---

## REVOKE-ADMIN

Removes a user from the admin group.

```text
REVOKE-ADMIN 'user';
```

### Example

```text
REVOKE-ADMIN 'alice';
```

---

## EXIT

Terminates the application.

```text
EXIT;
```

---

## CLEAR

Clears the terminal display.

```text
CLEAR;
```

---

# Permissions

The language recognizes these permission values:

* `READ`
* `DOALL`
* `NONE` is the internal deny state used by `REJECT`

---

# Inheritance

ACL entries can be inheritable or non-inheritable.

```text
ALLOW 'user' TO READ ON '/path' DONT INHERIT;
```

By default, `ALLOW` entries inherit unless `DONT INHERIT` is used.

---

# Practical Examples

```text
ADD-DF-USER;
ADD-USER 'alice' PWD 'secret';
ADD-USER 'bob' PWD 'hello123';
ADD-ADMIN 'alice';
ALLOW 'alice' TO DOALL ON '/srv';
ALLOW 'bob' TO READ ON '/srv/docs';
REJECT 'bob' ON '/srv/private';
GET-USERS;
GET-ACL;
COMMIT;
EXIT;
```

 