from flask import Flask, request, send_file, jsonify, send_from_directory
from flask_cors import CORS
import os
from PIL import Image
import io
import base64
from datetime import datetime
import shutil
import re

app = Flask(__name__, static_folder='static')
CORS(app)

# Serve static files
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/static/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/split-image', methods=['POST'])
def split_image():
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400

        data = request.json
        if not all(key in data for key in ['image', 'rows', 'cols']):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: image, rows, cols'
            }), 400

        # Extract image data
        try:
            image_data = data['image'].split(',')[1]  # Remove the data URL prefix
        except:
            return jsonify({
                'success': False,
                'error': 'Invalid image data format'
            }), 400

        rows = int(data['rows'])
        cols = int(data['cols'])

        if rows < 1 or cols < 1:
            return jsonify({
                'success': False,
                'error': 'Rows and columns must be positive numbers'
            }), 400

        # Create output directory
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        folder_name = f"split_images_{timestamp}"
        folder_path = os.path.join(os.path.dirname(__file__), 'static', 'output', folder_name)
        os.makedirs(folder_path, exist_ok=True)

        # Process image
        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            print(f"Error processing image: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to process image data'
            }), 400

        # Calculate dimensions
        width = image.width
        height = image.height
        piece_width = width // cols
        piece_height = height // rows

        if piece_width == 0 or piece_height == 0:
            return jsonify({
                'success': False,
                'error': 'Image too small for the specified split dimensions'
            }), 400

        # Split and save images
        try:
            for i in range(rows):
                for j in range(cols):
                    left = j * piece_width
                    upper = i * piece_height
                    right = left + piece_width
                    lower = upper + piece_height

                    piece = image.crop((left, upper, right, lower))
                    piece_path = os.path.join(folder_path, f'piece_{i+1}_{j+1}.png')
                    piece.save(piece_path)

            # Create zip file
            zip_path = folder_path + '.zip'
            shutil.make_archive(folder_path, 'zip', folder_path)

            return jsonify({
                'success': True,
                'downloadUrl': f'/static/output/{folder_name}.zip'
            })

        except Exception as e:
            print(f"Error saving image pieces: {str(e)}")
            return jsonify({
                'success': False,
                'error': 'Failed to save image pieces'
            }), 500

    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred'
        }), 500

if __name__ == '__main__':
    # Create output directory if it doesn't exist
    os.makedirs(os.path.join(os.path.dirname(__file__), 'static', 'output'), exist_ok=True)
    app.run(debug=True, port=5003)
