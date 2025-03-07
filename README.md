# Image Splitter SY

A web-based tool for splitting images into multiple pieces with various configurations.

## Features
- Split images into different configurations:
  - 2x2 Grid (default)
  - Vertical split (1x2)
  - Horizontal split (2x1)
  - Custom dimensions (XxY)
- Drag and drop interface
- Preview before splitting
- Automatic zip file generation of split images

## Setup
1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python server.py
```

4. Open in browser:
```
http://localhost:5003
```

## Technologies Used
- Frontend: HTML, CSS, JavaScript
- Backend: Flask (Python)
- Image Processing: Pillow
