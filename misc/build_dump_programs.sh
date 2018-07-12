
set -xe

mkdir -p dumpers_build dumpers_build/tmp
cd dumpers_build

# ------------------------
# POSTGRESQL
# ------------------------

# This will compile the pg_dump and libpq for your current arch
# bison and flex needed
git clone https://github.com/postgres/postgres.git --depth 1 tmp/postgres
cd tmp/postgres
./configure
cd src/interfaces/libpq
make
cd ../../..
cd src/bin/pg_dump
make
cd ../../../..

cp -L postgres/src/bin/pg_dump/pg_dump ./dump
cp -L postgres/src/bin/pg_dump/pg_restore ./restore
cp -L postgres/src/interfaces/libpq/libpq.so.5 ./
rm -rf postgres
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../postgres_md5

zip ../postgres.zip ./*
cd ../
rm -rf tmp
aws s3 cp postgres.zip s3://dl.dbacked.com --acl public-read
aws s3 cp postgres_md5 s3://dl.dbacked.com --acl public-read

# ------------------------
# MYSQL
# ------------------------

mkdir -p tmp
cd tmp
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz
tar -xf mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/mysqldump ./dump
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/mysql ./restore
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/libssl.so.1.0.0 ./
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/libcrypto.so.1.0.0 ./
rm -rf mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz mysql-8.0.11-linux-glibc2.12-x86_64
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../mysql_md5
zip ../mysql.zip ./*
cd ../
rm -rf tmp
aws s3 cp mysql.zip s3://dl.dbacked.com --acl public-read
aws s3 cp mysql_md5 s3://dl.dbacked.com --acl public-read

# ------------------------
# MongoDB
# ------------------------

mkdir -p tmp
cd tmp
git clone https://github.com/mongodb/mongo-tools --depth 1 ./mongodb
cd mongodb
. ./set_gopath.sh
mkdir bin
go build -o ../restore -tags ssl mongorestore/main/mongorestore.go
go build -o ../dump -tags ssl mongodump/main/mongodump.go
cd ../
rm -rf mongodb
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../mongodb_md5
zip ../mongodb.zip ./*
cd ../
rm -rf tmp
aws s3 cp mongodb.zip s3://dl.dbacked.com --acl public-read
aws s3 cp mongodb_md5 s3://dl.dbacked.com --acl public-read
