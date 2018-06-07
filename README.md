# DBacked Agent

This repo contains the agent needed to backup your PostgreSQL / MySQL database with the [DBacked service](https://dbacked.com). It's written in NodeJS and is compiled in a single binary for ease of use.

Its source code is released here so that you can read through it, audit it and compile it yourself before installing it on your server. This is optionnal but useful if you want to be 100% sure of what you execute on your servers.

To compile it, you need NodeJS (tested on v10.1.0), then install the dependancies with `npm install`, compile the typescript sources with `npm run build:ts` and finaly package it with NodeJS with `npm run build:bin`.

The compiled version is hosted on S3: [https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/dbacked_agent](https://s3.eu-central-1.amazonaws.com/dbacked-dumpprograms/pg_dump)
