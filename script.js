document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab-btn');
    const customOptions = document.querySelector('.custom-split-options');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const previewImage = document.getElementById('previewImage');
    const placeholder = document.getElementById('placeholder');
    const splitBtn = document.querySelector('.split-btn');
    const zipOption = document.getElementById('zipOption');
    const folderSelectBtn = document.getElementById('folderSelectBtn');
    const selectedFolderPath = document.getElementById('selectedFolderPath');

    const ratioOptions = document.querySelector('.ratio-options');
    const ratioPreset = document.getElementById('ratioPreset');
    const ratioCustomInputs = document.querySelector('.ratio-custom-inputs');
    const ratioW = document.getElementById('ratioW');
    const ratioH = document.getElementById('ratioH');
    const ratioCols = document.getElementById('ratioCols');
    const ratioInfo = document.getElementById('ratioInfo');

    let currentImage = null;
    let selectedDirectoryHandle = null;

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            customOptions.style.display = tab.dataset.option === 'custom' ? 'flex' : 'none';
            ratioOptions.style.display = tab.dataset.option === 'ratio' ? 'flex' : 'none';
            if (tab.dataset.option === 'ratio') updateRatioInfo();
        });
    });

    // Ratio preset change
    ratioPreset.addEventListener('change', () => {
        ratioCustomInputs.style.display = ratioPreset.value === 'custom' ? 'flex' : 'none';
        updateRatioInfo();
    });

    // Update info on any ratio input change
    [ratioW, ratioH, ratioCols].forEach(el => {
        el.addEventListener('input', updateRatioInfo);
    });

    function getSelectedRatio() {
        if (ratioPreset.value === 'custom') {
            return { w: parseInt(ratioW.value) || 1, h: parseInt(ratioH.value) || 1 };
        }
        const [w, h] = ratioPreset.value.split(':').map(Number);
        return { w, h };
    }

    function updateRatioInfo() {
        if (!currentImage) {
            ratioInfo.textContent = 'Upload an image to see piece dimensions';
            return;
        }
        const ratio = getSelectedRatio();
        const cols = parseInt(ratioCols.value) || 1;
        const pieceWidth = Math.floor(currentImage.width / cols);
        const pieceHeight = Math.floor(pieceWidth * ratio.h / ratio.w);
        if (pieceHeight <= 0) {
            ratioInfo.textContent = 'Invalid ratio';
            return;
        }
        const rows = Math.floor(currentImage.height / pieceHeight);
        if (rows <= 0) {
            ratioInfo.textContent = 'Pieces are taller than the image';
            return;
        }
        ratioInfo.textContent = `Will produce ${cols} x ${rows} = ${cols * rows} pieces (each ${pieceWidth}x${pieceHeight}px)`;
    }

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
                updateRatioInfo();
            };
        };
        reader.readAsDataURL(file);
    }

    // Folder selection functionality
    folderSelectBtn.addEventListener('click', async () => {
        try {
            if ('showDirectoryPicker' in window) {
                selectedDirectoryHandle = await window.showDirectoryPicker();
                selectedFolderPath.textContent = selectedDirectoryHandle.name;
            } else {
                alert('Folder selection is not supported in this browser. Files will be downloaded to your default Downloads folder.');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting folder:', error);
                alert('Error selecting folder. Files will be downloaded to your default Downloads folder.');
            }
        }
    });

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
                const inputs = document.querySelectorAll('.custom-split-options .dimension-input');
                cols = parseInt(inputs[0].value) || 1;
                rows = parseInt(inputs[1].value) || 1;
                break;
            case 'ratio':
                const ratio = getSelectedRatio();
                cols = parseInt(ratioCols.value) || 1;
                const pw = Math.floor(currentImage.width / cols);
                const ph = Math.floor(pw * ratio.h / ratio.w);
                if (ph <= 0) { alert('Invalid ratio'); return; }
                rows = Math.floor(currentImage.height / ph);
                if (rows <= 0) { alert('Pieces are taller than the image'); return; }
                splitImage(currentImage, rows, cols, pw, ph);
                return;
        }

        splitImage(currentImage, rows, cols);
    });

    async function splitImage(image, rows, cols, explicitWidth, explicitHeight) {
        try {
            // Show loading state
            splitBtn.disabled = true;
            splitBtn.textContent = 'Processing...';

            // Calculate dimensions for each piece
            const pieceWidth = explicitWidth || Math.floor(image.width / cols);
            const pieceHeight = explicitHeight || Math.floor(image.height / rows);

            // Create a temporary canvas for each piece
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = pieceWidth;
            canvas.height = pieceHeight;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const folderName = `split_images_${timestamp}`;
            
            const useZip = zipOption.checked;
            let zip, folder;

            if (useZip) {
                // Create a ZIP file
                zip = new JSZip();
                folder = zip.folder(folderName);
            }

            // Split the image and handle download
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

                    const fileName = `piece_${i + 1}_${j + 1}.png`;

                    if (useZip) {
                        // Add to ZIP
                        const pieceDataUrl = canvas.toDataURL('image/png');
                        const pieceData = pieceDataUrl.split(',')[1];
                        folder.file(fileName, pieceData, {base64: true});
                    } else {
                        // Download individual files
                        await downloadIndividualFile(canvas, fileName);
                    }
                }
            }

            if (useZip) {
                // Generate and download ZIP file
                const content = await zip.generateAsync({type: 'blob'});
                
                if (selectedDirectoryHandle && 'showDirectoryPicker' in window) {
                    try {
                        const fileHandle = await selectedDirectoryHandle.getFileHandle(`${folderName}.zip`, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(content);
                        await writable.close();
                        alert(`ZIP file saved to ${selectedDirectoryHandle.name}/${folderName}.zip`);
                    } catch (error) {
                        console.error('Error saving to selected folder:', error);
                        saveAs(content, `${folderName}.zip`);
                    }
                } else {
                    saveAs(content, `${folderName}.zip`);
                }
            } else {
                alert(`Successfully split image into ${rows * cols} pieces!`);
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

    async function downloadIndividualFile(canvas, fileName) {
        try {
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });

            if (selectedDirectoryHandle && 'showDirectoryPicker' in window) {
                try {
                    const fileHandle = await selectedDirectoryHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (error) {
                    console.error('Error saving to selected folder:', error);
                    // Fallback to regular download
                    saveAs(blob, fileName);
                }
            } else {
                // Regular download to Downloads folder
                saveAs(blob, fileName);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            // Fallback to data URL download
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
        }
    }
});

