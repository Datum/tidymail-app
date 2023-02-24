FROM node:12

WORKDIR /app

COPY package.json /app/package.json
RUN npm install -g @angular/cli@7.3.7
RUN npm install

COPY . /app

# Build app
RUN ng build --prod --base-href /app/

# Start app
CMD ng serve --host 0.0.0.0
