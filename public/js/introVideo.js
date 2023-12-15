document.addEventListener('DOMContentLoaded', function() {
    const introVideo = document.getElementById('introVideo');

    // Check if the visitor is new
    if (!localStorage.getItem('hasVisited')) {
        introVideo.style.display = 'block'; // Show the video
        introVideo.play(); // Start playing the video

        // When the video ends, hide it
        introVideo.onended = function() {
            introVideo.style.display = 'none';
        };

        // Set the flag in local storage
        localStorage.setItem('hasVisited', 'true');
    }
});