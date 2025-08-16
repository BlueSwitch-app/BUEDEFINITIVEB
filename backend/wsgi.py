from Sender import app# Reemplaza 'your_flask_file_name' por el nombre de tu archivo, sin .py
from waitress import serve

if __name__ == "__main__":
    serve(app, host="0.0.0.0", port=5000)
