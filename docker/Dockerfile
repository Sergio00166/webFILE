FROM python:3.13

WORKDIR /main

RUN apt-get update && apt-get install -y git ffmpeg \
    && git clone https://github.com/Sergio00166/webFILE.git /main \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir gunicorn \
    && pip install --no-cache-dir -r requirements.txt

WORKDIR /main/app

CMD ["gunicorn", "app:app", "--bind", "127.0.0.1:8080", "-workers", "$WORKERS", "--preload", "--timeout", "900"]
