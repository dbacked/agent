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
cd ../../..

cd ../
cp -L postgres/src/bin/pg_dump/pg_dump ./dump
cp -L postgres/src/interfaces/libpq/libpq.so ./
rm -rf postgres
cat `echo * | sort -` | md5sum -b | awk '{ printf $1 }' > ../postgres_md5

zip postgres.zip ./dump ./libpq.so
cd ../
mv tmp/postgres.zip ./
rm -rf tmp
