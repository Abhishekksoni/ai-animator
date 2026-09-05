FROM manimcommunity/manim:latest

USER root

# Install Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY . /app

# Ensure storage directories exist with write access
RUN mkdir -p /app/storage/media && chmod -R 777 /app/storage

USER manimuser

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
