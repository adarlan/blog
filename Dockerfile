FROM node:16-alpine as build-stage
COPY . /usr/src/blog
WORKDIR /usr/src/blog
RUN npm install
RUN npm run build

FROM nginx
COPY --from=build-stage /usr/src/blog/out /usr/share/nginx/html
