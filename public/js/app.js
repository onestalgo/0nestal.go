document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const uploadButton = document.getElementById("uploadButton");
  const fileInput = document.getElementById("fileInput");

  // const socket = io();
  const socket = io(window.location.origin);
  let images = [];
  images = images.map((img) => ({ ...img, locked: false }));

  const originalCanvasWidth = 1550;
  const originalCanvasHeight = 820;
  let scale = 1; // Default scale

  // JavaScript code for toggling the text overlay
  // JavaScript code for toggling the text overlay
  const aboutButton = document.getElementById("aboutButton");
  const popupWindow = document.getElementById("popupWindow");

  aboutButton.addEventListener("click", () => {
    popupWindow.classList.toggle("hidden");
  });

  const introVideo = document.getElementById("introVideo");
  const mobilePlayButton = document.getElementById("mobilePlayButton");

  // Function to determine if the user is on a mobile device
  function isMobileDevice() {
    return (
      /Mobi/i.test(navigator.userAgent) || /Android/i.test(navigator.userAgent)
    );
  }

  // Function to play the video and handle autoplay issues
  function playVideo() {
    const playPromise = introVideo.play();

    if (playPromise !== undefined) {
      playPromise
        .then((_) => {
          // Autoplay started successfully
          console.log("Autoplay started");
        })
        .catch((error) => {
          // Autoplay was prevented
          console.log("Autoplay prevented: ", error.message);
          // Show play button on mobile devices
          if (isMobileDevice()) {
            mobilePlayButton.style.display = "block";
          }
        });
    }
  }

  // Check if the visitor is new
  if (!localStorage.getItem("hasVisited")) {
    localStorage.setItem("hasVisited", "true"); // Set the flag in local storage
    introVideo.parentElement.style.display = "block"; // Show the video's parent container

    // Attempt to play the video
    playVideo();
  } else {
    // Returning visitor
    introVideo.parentElement.style.display = "none"; // Hide the video's parent container
  }

  // Event listener for the mobile play button
  mobilePlayButton.addEventListener("click", function () {
    introVideo.play();
    mobilePlayButton.style.display = "none"; // Hide the button after playing
  });

  // Hide the video's parent container when the video ends
  introVideo.onended = function () {
    introVideo.parentElement.style.display = "none";
  };

  const zoomSlider = document.getElementById("zoom-slider");
  zoomSlider.value = scale; // Set the slider's initial value to the scale

  updateCanvasSize(scale);

  zoomSlider.addEventListener("input", function () {
    scale = parseFloat(this.value);
    updateCanvasSize(scale);
  });

  function updateCanvasSize(scale) {
    canvas.width = originalCanvasWidth * scale;
    canvas.height = originalCanvasHeight * scale;
    drawImages();
  }

  //  canvas.width = 1440;  // Set desired dimensions
  // canvas.height = 900;

  function setupCanvasEventListeners() {
    canvas.addEventListener("click", function (e) {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left + window.scrollX) / scale;
      const clickY = (e.clientY - rect.top + window.scrollY) / scale;

      const clickedImage = getTopmostImageAtClick(clickX, clickY);
      if (clickedImage) {
        handleImageResizeAndAnimation(clickedImage, clickX, clickY);
      }
    });
    requestAnimationFrame(drawImages);
  }

  function getTopmostImageAtClick(x, y) {
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      if (
        x >= img.x &&
        x <= img.x + img.width &&
        y >= img.y &&
        y <= img.y + img.height
      ) {
        return img;
      }
    }
    return null;
  }

  function handleImageResizeAndAnimation(image, clickX, clickY) {
    if (
      clickX > image.x &&
      clickX < image.x + image.width &&
      clickY > image.y &&
      clickY < image.y + image.height &&
      !image.isAnimating
    ) {
      if (image.locked) {
        console.log("Image is currently being processed by another user");
        return; // Exit if the image is already locked
      }

      socket.emit("lockImage", { src: image.img.src });

      image.locked = true; // Lock the image

      const thirdWidth = image.width / 3;
      const leftThird = image.x + thirdWidth;
      const rightThird = image.x + 2 * thirdWidth;

      const deltaX = clickX < leftThird ? -18 : clickX > rightThird ? 18 : 0;
      const increase = 15;
      const newHeight = image.height + increase;
      const newWidth = newHeight * (image.img.width / image.img.height);
      const newCenterX = image.x + image.width / 2 + deltaX;
      const newX = newCenterX - newWidth / 2;
      const newY = image.y + (image.height - newHeight) / 2;

      drawStripedBorder(newX, newY, newWidth, newHeight); // Updated function call

      setTimeout(() => {
        image.locked = false;
        socket.emit("unlockImage", { src: image.img.src }); // Unlock the image across all clients

        image.x = newX; // Adjust coordinates back for internal data
        image.y = newY;
        image.width = newWidth;
        image.height = newHeight;
        drawImages();
        socket.emit("resizeAndMoveImage", {
          src: image.img.src,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });

        // Check and delete the image if it's off the canvas after resizing
        checkAndDeleteImage(image);
        drawImages;
      }, 400);
    }

    function drawStripedBorder(x, y, width, height) {
      // Apply the current scale to the border dimensions and position
      const scaledX = x * scale;
      const scaledY = y * scale;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      // Define the stripe width and spacing, scaled appropriately
      const stripeWidth = 10 * scale;
      const stripeSpacing = 5 * scale;
      const randomColor = `rgba(${Math.floor(
        Math.random() * 256
      )}, ${Math.floor(Math.random() * 256)}, ${Math.floor(
        Math.random() * 256
      )})`;

      ctx.save();
      ctx.strokeStyle = randomColor;
      ctx.lineWidth = 3 * scale; // Scale the line width
      ctx.setLineDash([stripeWidth, stripeSpacing]);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.restore();
    }
  }

  function checkAndDeleteImage(image) {
    const oneThirdWidth = image.width / 3;
    const offCanvasLeft = (image.x + oneThirdWidth) * scale < 0;
    const offCanvasRight = (image.x + 2 * oneThirdWidth) * scale > canvas.width;

    if (offCanvasLeft || offCanvasRight) {
      socket.emit("deleteImage", { src: image.img.src });
      removeImageFromCanvas(image);
    }
  }

  function removeImageFromCanvas(image) {
    const index = images.indexOf(image);
    if (index > -1) {
      images.splice(index, 1);
      drawImages(); // Redraw the canvas to reflect the deletion
    }
  }

  function setupSocketListeners() {
    socket.on("initialImages", (initialImages) => {
      images = initialImages.map((imageData) => {
        const img = new Image();
        img.onload = () => drawImages();
        img.src = imageData.src;
        return { ...imageData, img };
      });
    });

    socket.on("imageUpdate", (data) => {
      updateOrAddImage(data);
      drawImages();
    });

    socket.on("imageDeleted", (data) => {
      const indexToDelete = images.findIndex((image) => image.src === data.src);
      if (indexToDelete !== -1) {
        images.splice(indexToDelete, 1);
        drawImages();
      }
    });

    socket.on("lockImage", (data) => {
      const image = images.find((img) => img.src === data.src);
      if (image) {
        image.locked = true;
      }
    });

    socket.on("unlockImage", (data) => {
      const image = images.find((img) => img.src === data.src);
      if (image) {
        image.locked = false;
      }
    });
  }

  function drawImages() {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Iterate through each image and draw it on the canvas
    images.forEach((image) => {
      if (!image.isAnimating && image.x > -10000 && image.y > -10000) {
        // Calculate the dimensions and positions considering the scale
        const scaledWidth = image.width * scale;
        const scaledHeight = image.height * scale;
        const scaledX = image.x * scale;
        const scaledY = image.y * scale;

        // Draw the image on the canvas at the scaled dimensions and position
        ctx.drawImage(image.img, scaledX, scaledY, scaledWidth, scaledHeight);
      }
    });
  }

  uploadButton.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const sizeLimit = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > sizeLimit) {
      alert("File is too large.");
      return;
    }

    compressAndUploadImage(file);
  });
  function updateOrAddImage(data) {
    const index = images.findIndex((img) => img.src === data.src);
    if (index !== -1) {
      images[index] = { ...images[index], ...data };
    } else {
      const img = new Image();
      img.onload = () => {
        images.push({ ...data, img });
        drawImages();
      };
      img.src = data.src;
    }
  }

  function compressAndUploadImage(file) {
    compressImage(file, 500, 500, 0.6, (compressedBlob) => {
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

          socket.emit("uploadImage", {
            src: event.target.result,
            x,
            y,
            width,
            height,
          });
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
        const canvas = document.createElement("canvas");
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
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(callback, "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function captureCanvas() {
    const canvas = document.getElementById("canvas");
    const scaleFactor = 0.5; // Adjust this factor to reduce the image size

    // Create a temporary canvas to draw the scaled-down image
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width * scaleFactor;
    tempCanvas.height = canvas.height * scaleFactor;

    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.scale(scaleFactor, scaleFactor);
    tempCtx.drawImage(canvas, 0, 0);

    // Adjust the quality (0.1 to 1.0, lower means smaller size)
    return tempCanvas.toDataURL("image/jpeg", 0.5);
  }

  function uploadCanvasImage(imageData) {
    fetch("/api/upload-canvas-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    })
      .then((response) => response.json())
      .then((data) => console.log("Canvas image uploaded:", data))
      .catch((error) => console.error("Error uploading canvas image:", error));
  }

  // Set an interval to capture and upload the canvas image
  setInterval(() => {
    const canvasImage = captureCanvas();
    // Send this image to the server
    uploadCanvasImage(canvasImage);
  }, 26400000); // 5 hours in milliseconds (5 * 60 * 60 * 1000)

  setupCanvasEventListeners();
  setupSocketListeners();
});

//connexion
