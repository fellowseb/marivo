FROM python:3.10.20-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
EXPOSE 8081
ENTRYPOINT ["python3", "-u", "main.py"]
