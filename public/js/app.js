document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const uploadButton = document.getElementById('uploadButton');
   // const socket = io();
   const socket = io(window.location.origin);
    let images = [];

    canvas.width = 1440;  // Set desired dimensions
    canvas.height = 900;

    setupCanvasEventListeners();
    setupSocketListeners();

    function setupCanvasEventListeners() {
        canvas.addEventListener('click', function (e) {
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left + window.scrollX;
            const clickY = e.clientY - rect.top + window.scrollY;
    
            images.forEach(image => {
                if (clickX > image.x && clickX < image.x + image.width && clickY > image.y && clickY < image.y + image.height && !image.isAnimating) {
                    handleImageResizeAndAnimation(image, clickX, clickY);
                }
            });
        });
    
        function handleImageResizeAndAnimation(image, clickX, clickY) {
                if (clickX > image.x && clickX < image.x + image.width && clickY > image.y && clickY < image.y + image.height && !image.isAnimating) {
                    const thirdWidth = image.width / 3;
                    const leftThird = image.x + thirdWidth;
                    const rightThird = image.x + 2 * thirdWidth;
    
                    const deltaX = clickX < leftThird ? -10 : clickX > rightThird ? 10 : 0;
                    const increase = 10;
                    const newHeight = image.height + increase;
                    const newWidth = newHeight * (image.img.width / image.img.height);
                    const newCenterX = image.x + image.width / 2 + deltaX;
                    const newX = newCenterX - newWidth / 2;
                    const newY = image.y + (image.height - newHeight) / 2;
    
                    
                                 

                    const randomColor = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 0.5)`;
                    animateBorder(image, newX, newY, newWidth, newHeight, randomColor);
    
                    setTimeout(() => {
                        image.x = newX;
                        image.y = newY;
                        image.width = newWidth;
                        image.height = newHeight;
                        image.isAnimating = false;
                        socket.emit('resizeAndMoveImage', { src: image.img.src, x: newX, y: newY, width: newWidth, height: newHeight });
                        checkAndDeleteImage(image);
                    }, 500);
                }
            }

        function checkAndDeleteImage(image) {
            const oneThirdWidth = image.width / 3;
            const oneThirdHeight = image.height / 3;
            const offCanvas = image.x + oneThirdWidth < 0 || image.x + 2 * oneThirdWidth > canvas.width ||
                              image.y + oneThirdHeight < 0 || image.y + 2 * oneThirdHeight > canvas.height;
        
            const tooLarge = image.width >= 1000 || image.height >= 1000;
        
            if (offCanvas || tooLarge) {
                socket.emit('deleteImage', { src: image.img.src });
                
                const index = images.indexOf(image);
                if (index > -1) {
                    images.splice(index, 1);
                    drawImages(); // Redraw the canvas immediately
                }
            }
        }
    }

    function setupSocketListeners() {
        socket.on('initialImages', (initialImages) => {
            images = initialImages.map(imageData => {
                const img = new Image();
                img.src = imageData.src;
                return {...imageData, img};
            });
            drawImages();
        });

        socket.on('imageUpdate', data => {
            updateOrAddImage(data);
            drawImages();
        });

     
       

      
        socket.on('resizeAnimation', data => {
            images.forEach(image => {
                if (image.src === data.src) {
                    animateBorder(image, data.x, data.y, data.width, data.height, data.color);
                    setTimeout(() => {
                        if (image.src === data.src) {
                            image.x = data.x;
                            image.y = data.y;
                            image.width = data.width;
                            image.height = data.height;
                            image.isAnimating = false;
                            drawImages();
                        }
                    }, 500);
                }
            });
        });

        socket.on('imageDeleted', data => {
            // Relocate the image outside the canvas bounds
            const imageToDelete = images.find(image => image.src === data.src);
            if (imageToDelete) {
                imageToDelete.x = -10000; // Move far outside the canvas
                imageToDelete.y = -10000;
                drawImages(); // Redraw the canvas
            }
        });
    }

    function animateBorder(image, x, y, width, height, color) {
        let opacity = 0;
        const startTime = Date.now();
        const duration = 500;
    
        function animate() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            opacity = Math.min(elapsed / duration, 1); // Ensure opacity doesn't exceed 1
    
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Now, draw the border behind the specific image being animated
              ctx.save();
              ctx.globalAlpha = opacity;
              ctx.fillStyle = color;
              ctx.fillRect(x, y, width, height); // Draws the animated border behind the image
              ctx.restore();
      
              if (opacity < 1) {
                  requestAnimationFrame(animate);
              }
    
            // Draw all images first
            images.forEach(img => {
                ctx.drawImage(img.img, img.x, img.y, img.width, img.height);
            });
    
          
        }
    
        animate();
    }
    

    function drawImages() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        images.forEach(image => {
            if (image.x > -10000 && image.y > -10000) {
                ctx.drawImage(image.img, image.x, image.y, image.width, image.height);
            }
        });
    }
    
    
    

    uploadButton.addEventListener('click', function () {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*'; // Accept only image files
    
        input.onchange = e => {
            const file = e.target.files[0];
    
            if (!file || !file.type.startsWith('image/')) {
                alert('Please upload a valid image file.');
                return;
            }
    
            // Define a size limit, e.g., 5MB
            const sizeLimit = 5 * 1024 * 1024; // 5MB in bytes
    
            if (file.size > sizeLimit) {
                alert('The file is too large. Please upload an image smaller than 5MB.');
                return;
            }
    
            compressAndUploadImage(file);
        };
    
        input.click();
    });

    function updateOrAddImage(data) {
        const index = images.findIndex(image => image.src === data.src);
        if (index !== -1) {
            images[index] = {...images[index], ...data};
        } else {
            const img = new Image();
            img.onload = () => {
                images.push({...data, img});
                drawImages();
            };
            img.src = data.src;
        }
    }
    function compressAndUploadImage(file) {
        compressImage(file, 800, 800, 0.7, (compressedBlob) => {
            let reader = new FileReader();
            reader.onload = function (event) {
                let img = new Image();
                img.onload = function () {
                    let height = 50;
                    let ratio = img.width / img.height;
                    let width = height * ratio;
                    let x = Math.round(Math.random() * (canvas.width - width));
                    let y = Math.round(Math.random() * (canvas.height - height));
    
                    // Ensure event.target.result, which is the src, is not undefined
                    console.log("Uploading image with src:", event.target.result);
    
                    socket.emit('uploadImage', { src: event.target.result, x, y, width, height });
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(compressedBlob);
        });
    }

    function compressImage(file, maxWidth, maxHeight, quality, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(callback, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

