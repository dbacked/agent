set -xe

PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')

npm run build:ts
npm run build:bin
docker build . -t geekuillaume/dbacked:latest
docker tag geekuillaume/dbacked:latest geekuillaume/dbacked:$PACKAGE_VERSION
docker push geekuillaume/dbacked:latest
docker push geekuillaume/dbacked:$PACKAGE_VERSION
aws s3 cp dbacked s3://dbacked --acl public-read
aws s3 cp dbacked_md5 s3://dbacked --acl public-read
