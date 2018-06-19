# POSTGRESQL

set -xe

# This will compile the pg_dump and libpq for your current arch
# bison and flex needed
mkdir -p dumpers_build dumpers_build/tmp
cd dumpers_build
git clone https://github.com/postgres/postgres.git --depth 1 tmp/postgres
cd tmp/postgres
./configure
cd src/interfaces/libpq
make libpq
cd ../../..
cd src/bin/pg_dump
make pg_dump
cd ../../../..

cp -L postgres/src/bin/pg_dump/pg_dump ./dump
cp -L postgres/src/interfaces/libpq/libpq.so.5 ./
rm -rf postgres
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../postgres_md5

zip ../postgres.zip ./*
cd ../
rm -rf tmp

# MYSQL

mkdir -p tmp
cd tmp
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz
tar -xf mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/mysqldump ./dump
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/libssl.so.1.0.0 ./
cp -L mysql-8.0.11-linux-glibc2.12-x86_64/bin/libcrypto.so.1.0.0 ./
rm -rf mysql-8.0.11-linux-glibc2.12-x86_64.tar.gz mysql-8.0.11-linux-glibc2.12-x86_64
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../mysql_md5
zip ../mysql.zip ./*
cd ../
rm -rf tmp