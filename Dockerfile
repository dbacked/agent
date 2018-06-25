FROM ubuntu

RUN apt-get update && apt-get install curl -y
ENV TINI_VERSION v0.18.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

ADD ./dbacked /usr/bin/dbacked

ENTRYPOINT [ "/tini", "--" ]
CMD [ "dbacked", "start-agent" ]