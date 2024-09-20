FROM ubuntu:18.04

RUN apt update && apt upgrade -y && apt install -y python3

RUN mkdir -p /app/demos

COPY example.html /app/demos
COPY sgsr.html /app/demos
COPY anbox-stream-sdk.js /app
COPY serve.py /app

EXPOSE 8000
CMD cd /app && python3 ./serve.py
