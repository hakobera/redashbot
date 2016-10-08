FROM node:6.7

ENV DEBIAN_FRONTEND noninteractive

# Install IPA fonts
RUN apt-get update && \
    apt-get install -qqy --no-install-recommends apt-utils locales fonts-ipaexfont-gothic libfreetype6 libfontconfig && \
    apt-get clean && \
    rm -rf /var/cache/apt/archives/* /var/lib/apt/lists/*

RUN mkdir /opt/redashbot
WORKDIR /opt/redashbot

ADD package.json /opt/redashbot
RUN npm install
ADD . /opt/redashbot

ENTRYPOINT [ "node" ]
CMD [ "index.js" ]
