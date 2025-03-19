/**
 * Utility functions for the game
 */

// Convert Three.js object to Cannon.js body
function syncBodyToMesh(body, mesh) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
}

// Generate a random number between min and max
function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Check if device is mobile
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Clamp a value between min and max
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Show an element by ID
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

// Hide an element by ID
function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

// Update UI elements
function updateScore(value) {
    document.getElementById('score-value').textContent = value;
    document.getElementById('final-score').textContent = value;
}

function updateTimer(value) {
    document.getElementById('timer-value').textContent = Math.max(0, Math.ceil(value));
} 