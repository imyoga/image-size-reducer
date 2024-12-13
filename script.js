document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const controlsContainer = document.getElementById('controlsContainer');
    const originalPreview = document.getElementById('originalPreview');
    const modifiedPreview = document.getElementById('modifiedPreview');
    const originalSize = document.getElementById('originalSize');
    const originalDimensions = document.getElementById('originalDimensions');
    const modifiedSize = document.getElementById('modifiedSize');
    const modifiedDimensions = document.getElementById('modifiedDimensions');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const aspectRatioCheckbox = document.getElementById('aspectRatio');
    const pixelToggle = document.getElementById('pixelToggle');
    const percentageToggle = document.getElementById('percentageToggle');
    const widthUnit = document.getElementById('widthUnit');
    const heightUnit = document.getElementById('heightUnit');
    const downloadBtn = document.getElementById('downloadBtn');

    let originalImage = null;
    let originalBlob = null;
    let aspectRatio = 1;
    let isPixelMode = true;

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && isValidImageFile(file)) {
            handleImageUpload(file);
        }
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && isValidImageFile(file)) {
            handleImageUpload(file);
        }
    });

    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/png'];
        return validTypes.includes(file.type);
    }

    function handleImageUpload(file) {
        originalBlob = file; // Store the original file blob
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImage = new Image();
            originalImage.onload = () => {
                aspectRatio = originalImage.width / originalImage.height;
                
                // Display original image
                originalPreview.src = e.target.result;
                originalSize.textContent = formatFileSize(file.size);
                originalDimensions.textContent = `${originalImage.width} x ${originalImage.height}`;

                // Set initial values for width and height inputs
                widthInput.value = originalImage.width;
                heightInput.value = originalImage.height;

                // Hide upload container and show preview and controls
                dropZone.style.display = 'none';
                previewContainer.style.display = 'flex';
                controlsContainer.style.display = 'block';

                // Update modified preview
                updateModifiedPreview();
            };
            originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Toggle between pixels and percentage
    pixelToggle.addEventListener('click', () => {
        if (!isPixelMode) {
            isPixelMode = true;
            pixelToggle.classList.add('active');
            percentageToggle.classList.remove('active');
            widthUnit.textContent = 'px';
            heightUnit.textContent = 'px';
            widthInput.value = Math.round((parseFloat(widthInput.value) / 100) * originalImage.width);
            heightInput.value = Math.round((parseFloat(heightInput.value) / 100) * originalImage.height);
            updateModifiedPreview();
        }
    });

    percentageToggle.addEventListener('click', () => {
        if (isPixelMode) {
            isPixelMode = false;
            percentageToggle.classList.add('active');
            pixelToggle.classList.remove('active');
            widthUnit.textContent = '%';
            heightUnit.textContent = '%';
            widthInput.value = Math.round((parseFloat(widthInput.value) / originalImage.width) * 100);
            heightInput.value = Math.round((parseFloat(heightInput.value) / originalImage.height) * 100);
            updateModifiedPreview();
        }
    });

    widthInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked) {
            const width = parseFloat(widthInput.value);
            if (isPixelMode) {
                heightInput.value = Math.round(width / aspectRatio);
            } else {
                heightInput.value = width;
            }
        }
        updateModifiedPreview();
    });

    heightInput.addEventListener('input', () => {
        if (aspectRatioCheckbox.checked) {
            const height = parseFloat(heightInput.value);
            if (isPixelMode) {
                widthInput.value = Math.round(height * aspectRatio);
            } else {
                widthInput.value = height;
            }
        }
        updateModifiedPreview();
    });

    async function compressImage(blob, targetWidth, targetHeight, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                // If dimensions haven't changed and quality is 1, return original blob
                if (targetWidth === img.width && 
                    targetHeight === img.height && 
                    quality === 1) {
                    resolve(blob);
                    return;
                }

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // If dimensions haven't changed, use very high quality
                if (targetWidth === img.width && targetHeight === img.height) {
                    quality = 0.95;
                }

                const imageType = blob.type;
                canvas.toBlob((resultBlob) => {
                    // If the compressed size is larger than original, return original
                    if (resultBlob.size > blob.size) {
                        resolve(blob);
                    } else {
                        resolve(resultBlob);
                    }
                }, imageType, quality);
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    async function updateModifiedPreview() {
        if (!originalImage || !originalBlob) return;

        let newWidth, newHeight;
        if (isPixelMode) {
            newWidth = parseInt(widthInput.value);
            newHeight = parseInt(heightInput.value);
        } else {
            newWidth = Math.round((parseFloat(widthInput.value) / 100) * originalImage.width);
            newHeight = Math.round((parseFloat(heightInput.value) / 100) * originalImage.height);
        }

        // Calculate quality based on size reduction
        const originalArea = originalImage.width * originalImage.height;
        const newArea = newWidth * newHeight;
        const reductionRatio = newArea / originalArea;
        
        // More proportional quality reduction
        let quality = 1.0;
        if (newWidth !== originalImage.width || newHeight !== originalImage.height) {
            // Calculate quality based on reduction ratio
            // This will give a more gradual quality reduction
            // For example:
            // 100% size = 1.0 quality
            // 80% size = 0.9 quality
            // 60% size = 0.8 quality
            // 40% size = 0.7 quality
            // 20% size = 0.6 quality
            quality = Math.max(0.6, 0.5 + (reductionRatio * 0.5));
        }

        try {
            const compressedBlob = await compressImage(originalBlob, newWidth, newHeight, quality);
            modifiedPreview.src = URL.createObjectURL(compressedBlob);
            modifiedDimensions.textContent = `${newWidth} x ${newHeight}`;
            modifiedSize.textContent = formatFileSize(compressedBlob.size);
        } catch (error) {
            console.error('Error compressing image:', error);
        }
    }

    downloadBtn.addEventListener('click', async () => {
        if (!originalImage || !originalBlob) return;

        let newWidth, newHeight;
        if (isPixelMode) {
            newWidth = parseInt(widthInput.value);
            newHeight = parseInt(heightInput.value);
        } else {
            newWidth = Math.round((parseFloat(widthInput.value) / 100) * originalImage.width);
            newHeight = Math.round((parseFloat(heightInput.value) / 100) * originalImage.height);
        }

        const originalArea = originalImage.width * originalImage.height;
        const newArea = newWidth * newHeight;
        const reductionRatio = newArea / originalArea;
        
        // Use the same proportional quality reduction for download
        let quality = 1.0;
        if (newWidth !== originalImage.width || newHeight !== originalImage.height) {
            quality = Math.max(0.6, 0.5 + (reductionRatio * 0.5));
        }

        try {
            const compressedBlob = await compressImage(originalBlob, newWidth, newHeight, quality);
            const url = URL.createObjectURL(compressedBlob);
            const link = document.createElement('a');
            const extension = originalBlob.type.includes('png') ? 'png' : 'jpg';
            link.download = `reduced-image.${extension}`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
});
