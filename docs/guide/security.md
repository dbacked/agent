# Security

Security is at the heart of DBacked. This is YOUR data and YOUR USERS data and should be protected accordingly. When backing up your database, everything will be encrypted before leaving your server. You don't have to trust me or your storage provider, nobody except you can access your data.

This also means that if you lose your encryption key, you'll lose access to your backups. This is a risk but compared to the risk of leaking data, the choice is easily made.

Security also means being sure your backups are always ready when you need them. You need to avoid *Schrödinger backups*, backups that are working or not working at the same time but you'll know for sure when you'll try to restore them. Look at the ["Why not X?"](/guide/#why-not-x) for more information about problems you can get with some backup methods.

You'll find more informations on this page about what DBacked does to protect your data.

## Encryption

At the heart of DBacked is the data encryption module. It uses a mix of RSA and AES encryption with a public/private RSA key pair. This means you use a *public* key on your servers, this key can be leaked without problems, and keep the *private* key seprate and use it only when you need to restore a backup.

[RSA](https://en.wikipedia.org/wiki/RSA_(cryptosystem)) is a asymetrical encryption algorithm used everywhere. It's well known and used since 1977 to handle private communication. This algorithm has been inspected many time and is considered safe. The NodeJS implementation of this algorithm is used.

RSA is not designed to encrypt large files. Most protocols use a mix of RSA and AES. AES is a symetrical encryption, meaning you need the same passphrase to encrypt and decrypt it. What DBacked does is creating a random passphrase for every backup and then encrypting this passphrase with your public key and RSA. This encrypted passphrase is stored at the beginning of the backup file.

This way, your backups are well secured while staying fast to encrypt and decrypt.

## Integrity check

When uploading your backups to AWS S3, DBacked will compute and send the backup MD5 checksum. If an error is detected, the upload will restart from the current chunk. Most backup solutions don't implement this and can lead to corrupted backup that will silently fail.

## Dump program monitoring

Like most backup solutions, DBacked uses `pg_dump`, `mysqldump` and `mongodump`. This programs are monitored during their execution and if an error is detected (exit code different from 0) the backup will be aborted. This prevents backups that will silently fails.

## Email alerts

DBacked can send you multiple email alerts when errors are detected. If you are using DBacked free and provide your email, an alert will be sent if no backups were completed in the last 30 days. When using DBacked pro, you'll receive an alert for every backup failure and if the backup are more than an hour late.

## What's sent to DBacked servers?

If you are using DBacked Free, you'll be asked for your email for email alerts. This requires a monitoring of your backups on our servers. To do so, a unique random identifier will be created for your database and will be sent, with the email address provided, on our servers everytime a backup is completed. Nothing in your database will be sent. The DBacked version will also be sent, this will allow me to build feature to send you an alert when you should update your DBacked binary.

DBacked will also ask you if you want to send anonymous analytics. This is used to get a better view on how DBacked is used and which improvements I should prioritize. Some informations will be sent everytime a backup finishes:
- The database used (PostgreSQL, MySQL or MongoDB)
- The version of DBacked used
- The configured cron expression
- If you are using or not the `dumperOptions` config
- If you are using DBacked Free or DBacked Pro
- If you are running DBacked on your database server or an different one
- The size of your backup
- How long was the backup process

This information is anonymous and your IP or anything that could identify you is never stored.

I want to thank everyone sending these informations, it helps me a lot to continue to improve DBacked.
