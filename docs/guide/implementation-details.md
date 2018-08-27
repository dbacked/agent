# Implementation details

You are curious about what's running on your server, well I am too and this page is for you. I tried my best to make the code readable but an english explanation is still useful. Here's some details about how DBacked works.

## Scheduler implementation

Before starting a backup, DBacked needs to know if a backup is required. Most people uses a cron expression to handle this but it's limited (if you are running multiple servers or using ephemeral containers for example).

DBacked Pro uses an external service to handle this. Our servers stores the last time the backups were performed and every 5 minutes, the program on your server will ask the API if a backup is needed. It will also make sure that two backups cannot be started at the same time.

DBacked Free stores the last backup date in a special table in your database. This table is named `dbacked` and stores this date and the database ID (used for alerts). If you remove this table, it will be recreated automatically.

These methods allows you to execute DBacked on multiple servers at the same time (but only DBacked Pro prevent multiple backups to be started at the same time). It also prevent the need to store a file on your server and can be used in ephemeral infrastructures like Docker containers.

## Backup process

The main DBacked process, when a backup is needed, will fork and launch a subprocess that will manage the backup. This way, if a crash happens, it's caught by the master process and will not crash the whole long-lived process.

When starting a backup, DBacked will check if the database tools are downloaded and not corrupted. To do so, it will download the MD5 of the tools archive from `https://dl.dbacked.com/mysql_md5`, or `https://dl.dbacked.com/postgres_md5` or `https://dl.dbacked.com/mongodb_md5` and if it doesn't match the hash of the content of the tool directory (configured with the `databaseToolsDirectory` config), will download them.

I included the [`misc/build_dump_programs.sh`](https://github.com/dbacked/agent/blob/master/misc/build_dump_programs.sh) script to download, build from source and package the dumper and restorer tool of PostgreSQL, MySQL and MongoDB. It will also include the required lib in the archive to make the binaries more portable.

Next, a new 256bits AES key will be created using the `crypto.randomBytes` method of NodeJS. This uses a Cryptographically Secure Pseudo-Random Number Generator that is secure enough to generate a random key. It will also generate a unique IV for the AES cipher. This AES key is encrypted with the RSA public key using the `crypto.publicEncrypt` method of NodeJS.

The dumper tool is started with the corresponding arguments. From this point, DBacked will listen for its exit event and if the exit code is different from 0, will emit an error. The dumper is configured to output the backup data on its standard output which is piped in the AES cipher then splitted in chunks. Each chunk needs to be stored in memory to compute its MD5 hash before uploading to S3. The chunk size starts from 5MB for the first 5 chunks, then 50MB for the next 25, then 100MB for the next 25 and then 200MB. This behaviour is used to reduce the memory requirement for small backups and at the same time allow big uploads to S3 which limit the total number of chunks to 10,000.

On DBacked free, the `createMultipartUpload` and `completeMultipartUpload` S3 APIs are called to manage the chunked upload. With DBacked Pro, the API will provide a signed S3 URL for each chunk.

Each chunk is uploaded to S3 with its MD5 that is checked on S3 side.

At the end of the process, for DBacked Free, the last backup date will be update in the database and a metadata JSON file will be stored to S3. For DBacked Pro, a API call will be executed to signal the end of the backup.

The backup process then quit and the main process starts its scheduler loop again.

## Restore process

The restore process is similar to the backup process. It will also check for the database related tools and then execute the restorer. Before doing that, it will ask for which backup to restore.

The whole operation is inverted. First the AES key is decrypted, then the S3 stream is piped to the restorer's stdin. This way, no temporary files are necessary and the memory need is low.

## Backup file format

DBacked uses a specific file format for its backups. As they are encrypted, you cannot pipe them directly to `mysqlrestore` or another tool.

Here's the structure of the file:
- `DBACKED` magic field (7 bytes): Used to check if the file is a DBacked backup file
- Version (3 bytes): Used to show a warning if the backup was created with a different DBacked version
- Encrypted AES key length in bytes (4 bytes): as the AES key was encrypted with your RSA key, the length of the encrypted key is equals to your RSA key length and so need to be stored in the file
- Encrypted AES key (X bytes depanding on the previous field): will be decrypted with the private RSA key on restore
- AES IV (16 bytes): Used to initialize the AES cipher
- Database dump: The rest of the file is the database dumper output

