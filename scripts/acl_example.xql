FLUSH ALL;
ADD-DF-USR;
ADD-USER 'admin' PWD '1234';
ALLOW 'admin' TO DOALL ON '/';
ALLOW 'DEFAULT' TO READ ON '/';
REJECT 'DEFAULT' ON '/private';
COMMIT;
GET-ACL;