document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab-btn');
    const customOptions = document.querySelector('.custom-split-options');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewImage = document.getElementById('previewImage');
    const placeholder = document.getElementById('placeholder');
    const splitBtn = document.querySelector('.split-btn');

    let currentImage = null;

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            customOptions.style.display = tab.dataset.option === 'custom' ? 'flex' : 'none';
        });
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImage(file);
        }
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleImage(e.target.files[0]);
        }
    });

    function handleImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImage = new Image();
            currentImage.src = e.target.result;
            currentImage.onload = () => {
                previewImage.src = currentImage.src;
                previewImage.style.display = 'block';
                placeholder.style.display = 'none';
            };
        };
        reader.readAsDataURL(file);
    }

    // Split image functionality
    splitBtn.addEventListener('click', () => {
        if (!currentImage) {
            alert('Please upload an image first');
            return;
        }

        const activeTab = document.querySelector('.tab-btn.active');
        const option = activeTab.dataset.option;
        let rows = 1, cols = 1;

        switch (option) {
            case 'vertical':
                cols = 2;
                break;
            case 'horizontal':
                rows = 2;
                break;
            case 'grid':
                rows = 2;
                cols = 2;
                break;
            case 'custom':
                const inputs = document.querySelectorAll('.dimension-input');
                cols = parseInt(inputs[0].value) || 1;
                rows = parseInt(inputs[1].value) || 1;
                break;
        }

        splitImage(currentImage, rows, cols);
    });

    async function splitImage(image, rows, cols) {
        // Create a canvas to convert the image to base64
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = canvas.toDataURL('image/png');

        try {
            // Show loading state
            splitBtn.disabled = true;
            splitBtn.textContent = 'Processing...';

            // Send the image to the backend
            const response = await fetch('http://localhost:5003/split-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageData,
                    rows: rows,
                    cols: cols
                })
            });

            const data = await response.json();
            console.log('Server response:', data);
            
            if (data.success) {
                // Create download link for the zip file
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = 'split_images.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                throw new Error(data.error || 'Unknown error occurred');
            }
        } catch (error) {
            console.error('Error details:', error);
            alert(`Error splitting image: ${error.message || 'Please try again'}`);
        } finally {
            // Reset button state
            splitBtn.disabled = false;
            splitBtn.textContent = 'SPLIT IMAGE';
        }
    }
});

