FROM python:3.15.2-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
EXPOSE 8081
ENTRYPOINT ["python3", "-u", "main.py"]
