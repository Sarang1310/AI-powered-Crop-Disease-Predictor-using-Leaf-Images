// script.js (Final Corrected and Reordered Version)

// --- 1. GET ALL HTML ELEMENTS (MUST BE AT THE TOP) ---
const imageUpload = document.getElementById('image-upload');
const predictButton = document.getElementById('predict-button');
const resultContainer = document.getElementById('result-container');
const fileNameDisplay = document.getElementById('file-name');
const imagePreview = document.getElementById('image-preview');
const spinner = document.getElementById('loading-spinner');
const clearButton = document.getElementById('clear-button');
const dropArea = document.getElementById('drop-area');
const cameraButton = document.getElementById('camera-button');
const cameraView = document.getElementById('camera-view');
const videoFeed = document.getElementById('video-feed');
const captureButton = document.getElementById('capture-button');
const closeCameraButton = document.getElementById('close-camera-button');
const historyList = document.getElementById('history-list');
const themeToggle = document.getElementById('theme-toggle');
const infoModal = document.getElementById('info-modal');
const closeModalButton = document.getElementById('close-modal-button');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const chartWrapper = document.getElementById('chart-wrapper');

let stream = null;
let diseaseInfo = {};
let predictionChart = null;


// --- 2. DEFINE ALL FUNCTIONS ---

function createLeaves() {
    const container = document.querySelector('.leaves-container');
    if (!container) return;
    const numberOfLeaves = 15;
    for (let i = 0; i < numberOfLeaves; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf';
        leaf.style.left = `${Math.random() * 100}vw`;
        leaf.style.animationDuration = `${Math.random() * 8 + 7}s`;
        leaf.style.animationDelay = `${Math.random() * 5}s`;
        const scale = Math.random() * 0.5 + 0.5;
        leaf.style.transform = `scale(${scale})`;
        container.appendChild(leaf);
    }
}

async function loadDiseaseInfo() {
    try {
        const response = await fetch('./disease_info.json');
        if (!response.ok) throw new Error('Network response was not ok');
        diseaseInfo = await response.json();
    } catch (error) {
        console.error("Could not load disease info:", error);
    }
}

function openModal(diseaseKey) {
    const info = diseaseInfo[diseaseKey];
    if (!info) {
        modalTitle.textContent = "Information Not Found";
        modalBody.innerHTML = "<p>Details for this disease are not yet available in disease_info.json.</p>";
    } else {
        modalTitle.textContent = diseaseKey.replace(/_/g, ' ');
        modalBody.innerHTML = `
            <p>${info.description}</p>
            <h3>Symptoms</h3>
            <ul>${info.symptoms.map(s => `<li>- ${s}</li>`).join('')}</ul>
            <h3>Recommended Actions</h3>
            <ul>${info.actions.map(a => `<li>- ${a}</li>`).join('')}</ul>
        `;
    }
    infoModal.classList.remove('hidden');
}

function closeModal() {
    infoModal.classList.add('hidden');
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light-mode') {
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
    }
}

function getHistory() { return JSON.parse(localStorage.getItem('predictionHistory')) || []; }
function saveHistory(history) { localStorage.setItem('predictionHistory', JSON.stringify(history)); }
function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyList.innerHTML = '<li>No predictions yet.</li>';
        return;
    }
    history.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `<span>${item.disease.replace(/_/g, ' ')}</span><span class="confidence">${item.confidence}</span>`;
        historyList.appendChild(li);
    });
}

function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraView.classList.add('hidden');
}

function handleFile(file) {
    if (file) {
        document.getElementById('output-placeholder').classList.add('hidden');
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            imagePreview.classList.add('fade-in');
        };
        reader.readAsDataURL(file);
    }
}

function renderPredictionChart(predictions) {
    chartWrapper.classList.remove('hidden');
    const ctx = document.getElementById('prediction-chart').getContext('2d');
    const labels = predictions.map(p => p.disease.replace(/_/g, ' '));
    const data = predictions.map(p => p.confidence * 100);

    if (predictionChart) {
        predictionChart.destroy();
    }

    const chartTextColor = document.body.classList.contains('light-mode') ? '#374151' : 'rgba(255, 255, 255, 0.8)';

    predictionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Confidence',
                data: data,
                backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(167, 139, 250, 0.7)', 'rgba(239, 68, 68, 0.7)'],
                borderColor: ['#3B82F6', '#A78BFA', '#EF4444'],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true, max: 100,
                    ticks: { callback: function(value) { return value + "%" }, color: chartTextColor },
                    grid: { color: 'rgba(128, 128, 128, 0.2)' }
                },
                y: {
                    ticks: { color: chartTextColor },
                    grid: { display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- 3. ADD EVENT LISTENERS ---

closeModalButton.addEventListener('click', closeModal);
infoModal.addEventListener('click', (e) => { if (e.target === infoModal) closeModal(); });

themeToggle.addEventListener('change', () => {
    if (themeToggle.checked) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light-mode');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark-mode');
    }
    // Re-render the chart with the new theme colors if it exists
    if (predictionChart) {
        renderPredictionChart(predictionChart.data.datasets[0].data.map((conf, i) => ({
            disease: predictionChart.data.labels[i],
            confidence: conf / 100
        })));
    }
});

cameraButton.addEventListener('click', async () => {
    cameraView.classList.remove('hidden');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoFeed.srcObject = stream;
        videoFeed.play();
    } catch (error) {
        console.error("Error accessing camera:", error);
        alert("Could not access camera.");
        cameraView.classList.add('hidden');
    }
});

captureButton.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoFeed.videoWidth;
    canvas.height = videoFeed.videoHeight;
    canvas.getContext('2d').drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
        const file = new File([blob], "camera_capture.png", { type: "image/png" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageUpload.files = dataTransfer.files;
        handleFile(file);
    }, 'image/png');
    stopCamera();
});

closeCameraButton.addEventListener('click', stopCamera);
imageUpload.addEventListener('change', () => handleFile(imageUpload.files[0]));

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.add('drag-over'), false));
['dragleave', 'drop'].forEach(eventName => dropArea.addEventListener(eventName, () => dropArea.classList.remove('drag-over'), false));
dropArea.addEventListener('drop', (e) => {
    const droppedFile = e.dataTransfer.files[0];
    imageUpload.files = e.dataTransfer.files;
    handleFile(droppedFile);
}, false);

predictButton.addEventListener('click', async () => {
    const file = imageUpload.files[0];
    if (!file) { alert("Please select an image file first."); return; }
    const formData = new FormData();
    formData.append('file', file);
    resultContainer.innerHTML = ''; resultContainer.classList.remove('fade-in');
    spinner.style.display = 'block'; chartWrapper.classList.add('hidden');
    try {
        const response = await fetch('http://127.0.0.1:5000/predict', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        const results = await response.json();
        if (results.error) {
            resultContainer.innerHTML = `<p class="result-diseased">${results.error}</p>`;
        } else {
            const topPrediction = results[0];
            const history = getHistory();
            const newEntry = { disease: topPrediction.disease, confidence: `${(topPrediction.confidence * 100).toFixed(2)}%` };
            history.unshift(newEntry);
            saveHistory(history.slice(0, 5));
            renderHistory();
            let resultClass = topPrediction.disease.toLowerCase().includes('healthy') ? 'result-healthy' : 'result-diseased';
            const detailsButton = `<button class="button" onclick="openModal('${topPrediction.disease}')">Details</button>`;
            resultContainer.innerHTML = `
                <p class="${resultClass}"><strong>Prediction:</strong> ${topPrediction.disease.replace(/_/g, ' ')}</p>
                <p class="${resultClass}"><strong>Confidence:</strong> ${(topPrediction.confidence * 100).toFixed(2)}% ${detailsButton}</p>
            `;
            renderPredictionChart(results);
        }
        resultContainer.classList.add('fade-in');
    } catch (error) {
        console.error('Error:', error);
        resultContainer.innerHTML = `<p class="result-diseased">Failed to get prediction. Make sure the backend server is running.</p>`;
    } finally {
        spinner.style.display = 'none';
    }
});

clearButton.addEventListener('click', () => {
    imageUpload.value = null;
    imagePreview.classList.add('hidden');
    imagePreview.classList.remove('fade-in');
    resultContainer.classList.remove('fade-in');
    fileNameDisplay.textContent = 'No file chosen';
    resultContainer.innerHTML = '';
    document.getElementById('output-placeholder').classList.remove('hidden');
    chartWrapper.classList.add('hidden');
});

// --- 4. INITIALIZE APP ---
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    renderHistory();
    loadDiseaseInfo();
    createLeaves();
});