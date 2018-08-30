<p align="center">
  <img src="misc/media/promo.png" width="400">
</p>

DBacked is the "database backup script" killer. It backups your PostgreSQL / MySQL / MongoDB database, encrypt it and stream it on S3. Unlike basic scripts, it also packs the  restore process to get data back from your backups in 30 seconds.

It uses `pg_dump`, `mysqldump` or `mongodump` and adds:
- Simple install process
- Interactive configuration
- No cron tab editing
- Encryption with a public/private key pair
- Streaming upload to AWS S3
- Backup restore process
- Docker compatibility
- Email alerts when last backup is older than 30 days
- Works with big databases (150+GB) without temp files

DBacked is free but also includes a pro version that handle S3 for you, alerts you when the backups are 30 minutes late and works in a distributed environment. For more information, look at the [DBacked SaaS website](https://dbacked.com/).

Its source code is released here so that you can read through it, audit it and compile it yourself before installing it on your server. This is optionnal but useful if you want to be 100% sure of what you execute on your servers.

The compiled version is hosted here: [https://dl.dbacked.com/dbacked](https://dl.dbacked.com/dbacked)

For more info, look at the documentation: [https://dbacked.github.io/agent/](https://dbacked.github.io/agent/).
