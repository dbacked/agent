# Introduction

DBacked is the "database backup script" killer. It backups your PostgreSQL / MySQL / MongoDB database, encrypt it and stream it on S3. Unlike basic scripts, it also includes the restore process to get data back from your backups in 30 seconds.

DBacked is free but also includes a pro version that handle S3 for you, alerts you when the backups are 30 minutes late and works in a distributed environment. For more information, look at the [DBacked SaaS website](https://dbacked.com/).

The compiled version is hosted here: [https://dl.dbacked.com/dbacked](https://dl.dbacked.com/dbacked)

<!--  TODO: Install GIF -->

## What's inside?

DBacked uses `pg_dump`, `mysqldump` or `mongodump` and includes:
- Simple install process
- Interactive configuration
- No cron tab editing
- Automatic SystemD service creation (Ubuntu and other)
- Encryption with a public/private key pair
- Streaming upload to your own AWS S3 bucket
- Backup restore process
- Docker compatibility
- Email alerts when last backup is older than 30 days
- Works with big databases (150+GB) without temp files

Once installed, it checks every 5 minutes if a backup is needed, downloads the last version of `pg_dump`, `mysqldump` or `mongodump`, starts it, encrypts the output and streams it to Amazon S3 while monitoring the backup process.

When you want to restore a backup, DBacked will get the list of available backups from your AWS S3 bucket, let you select the one you want from an interactive list, decrypt it and stream it to `pg_restore`, `mysqlrestore` or `mongorestore`. It's the fastest way to get your data back.

## Why not X?

### Amazon Web Services RDS backups

Amazon RDS provides an automated backup system but it's limited to a retention of 35 days and a frequency of one per day. The automated backups will be deleted when the database is deleted (which someone can do by accident). Also, the backups are encrypted with a key you don't own. If you want to only use the backups provided by RDS, you should create a script that will manualy backup your RDS instance and transfer the ownership of these backups to another AWS account that will only be used for this usage. This will protect you from an attacker getting access to your AWS account.

### Basic script in a crontab

A lot of things can go wrong with a simple script in your crontab like not having enough space available on your server to store the backup or changing the credentials in your database and forgeting to update them in your script. It's also easy to forget to setup the cron while migrating on a new server.

### Database files copy

Most database systems, including PostgreSQL, MySQL and MongoDB recommends that you stop the database before making a copy of the database files. The reason is that the files can be modified by a database write while you are copying them, resulting in a corrupted backup. You should use a program like pg_dump, mysqldump or mongodump or a frozen snapshot of your filesystem if it supports it.
