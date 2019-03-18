FROM node:11.1.0-alpine
RUN apk update && apk add bash && apk add --no-cache tzdata
ENV TZ="Asia/Shanghai"

ADD /src /root/src
ADD package.json /root
ADD tsconfig.json /root
ADD start.sh /root

WORKDIR /root
RUN npm install
RUN ls src
RUN npm run build

CMD ["./start.sh"]