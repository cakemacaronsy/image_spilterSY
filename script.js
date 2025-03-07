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
        try {
            // Show loading state
            splitBtn.disabled = true;
            splitBtn.textContent = 'Processing...';

            // Calculate dimensions for each piece
            const pieceWidth = Math.floor(image.width / cols);
            const pieceHeight = Math.floor(image.height / rows);

            // Create a ZIP file
            const zip = new JSZip();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const folderName = `split_images_${timestamp}`;
            const folder = zip.folder(folderName);

            // Create a temporary canvas for each piece
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;

            // Split the image and add pieces to ZIP
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    // Clear canvas for new piece
                    ctx.clearRect(0, 0, pieceWidth, pieceHeight);

                    // Draw piece of original image onto canvas
                    ctx.drawImage(
                        image,
                        j * pieceWidth, // Source X
                        i * pieceHeight, // Source Y
                        pieceWidth, // Source width
                        pieceHeight, // Source height
                        0, // Destination X
                        0, // Destination Y
                        pieceWidth, // Destination width
                        pieceHeight // Destination height
                    );

                    // Convert canvas to blob and add to ZIP
                    const pieceDataUrl = canvas.toDataURL('image/png');
                    const pieceData = pieceDataUrl.split(',')[1];
                    folder.file(`piece_${i + 1}_${j + 1}.png`, pieceData, {base64: true});
                }
            }

            // Generate and download ZIP file
            const content = await zip.generateAsync({type: 'blob'});
            saveAs(content, `${folderName}.zip`);

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

