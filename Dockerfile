FROM python:3.12-alpine
WORKDIR /app
COPY index.html app.js cases.js twin.js operations.js realtime.js styles.css operations.css showcase.css favicon.svg visit.js visit-config.js owner.html owner.js serve.py tbc.html tbc.css tbc.js tbc-tailwind.css ./
COPY ops-assets ./ops-assets
COPY vendor ./vendor
RUN adduser -D lab && mkdir /data && chown lab:lab /data
USER lab
EXPOSE 8089
CMD ["python", "serve.py", "--bind", "0.0.0.0", "--port", "8089", "--runtime", "/data"]
