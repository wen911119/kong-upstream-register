FROM node:alpine
ADD /src /root/src
ADD package.json /root
ADD start.sh /root

WORKDIR /root
RUN npm install --registry=https://registry.npm.taobao.org && rm -rf /root/.npm*
RUN npm run build

CMD ["./start.sh"]