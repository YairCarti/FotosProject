document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const loader = document.getElementById('loader');
    const cameraView = document.getElementById('cameraView');
    const previewContainer = document.getElementById('previewContainer');
    const snapButton = document.getElementById('snapButton');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');
    const previewImage = document.getElementById('previewImage');
    const galleryList = document.getElementById('gallery-list');
    
    // Nuevos elementos y variables
    const switchCameraButton = document.getElementById('switchCameraButton');
    const BACKEND_URL = '';
    let photoBlob = null;
    let splide = null;
    let currentStream = null;
    let facingMode = 'user';

    // Función de inicio de cámara
    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        const constraints = { audio: false, video: { facingMode: facingMode } };
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            currentStream = stream;
        } catch (err) {
            console.error("Error al acceder a la cámara con facingMode: ", err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                video.srcObject = stream;
                currentStream = stream;
            } catch (fallbackErr) {
                console.error("Error al acceder a la cámara en modo simple: ", fallbackErr);
                alert("No se pudo acceder a ninguna cámara. Asegúrate de dar los permisos necesarios.");
            }
        }
    }

    // Función para verificar si hay múltiples cámaras (versión limpia, sin alertas)
    async function checkForMultipleCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                switchCameraButton.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Error al enumerar dispositivos: ", err);
        }
    }

    // Listener para tomar foto
    snapButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            photoBlob = blob;
            previewImage.src = URL.createObjectURL(blob);
        }, 'image/jpeg');
        cameraView.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    });
    
    // Listener para cambiar de cámara
    switchCameraButton.addEventListener('click', () => {
        facingMode = (facingMode === 'user') ? 'environment' : 'user';
        video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
        startCamera();
    });

    // Lógica de Cancelar y Confirmar
    cancelButton.addEventListener('click', () => {
        photoBlob = null;
        previewContainer.classList.add('hidden');
        cameraView.classList.remove('hidden');
    });
    confirmButton.addEventListener('click', () => { if (photoBlob) { uploadPhoto(photoBlob); } });

    // Función de subir foto
    async function uploadPhoto(blob) {
        const formData = new FormData();
        formData.append('photo', blob, 'fiesta-foto.jpg');
        previewContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        try {
            const response = await fetch(`${BACKEND_URL}/upload`, { method: 'POST', body: formData });
            if (!response.ok) { throw new Error('La foto no se pudo subir.'); }
            await loadPhotos();
        } catch (error) {
            console.error('Error al subir la foto:', error);
            alert('Hubo un problema al subir tu foto. Inténtalo de nuevo.');
        } finally {
            loader.classList.add('hidden');
            cameraView.classList.remove('hidden');
            photoBlob = null;
        }
    }

    // Función de cargar galería con carrusel
    async function loadPhotos() {
        try {
            const response = await fetch(`${BACKEND_URL}/photos`);
            if (!response.ok) throw new Error('No se pudo cargar la galería.');
            const photoUrls = await response.json();
            galleryList.innerHTML = ''; 
            photoUrls.forEach((url, index) => {
                const slide = document.createElement('li');
                slide.className = 'splide__slide';
                const photoContainer = document.createElement('div');
                photoContainer.className = 'photo-container';
                const img = document.createElement('img');
                img.src = url;
                const filename = `fiesta_foto_${index + 1}`;
                const downloadUrl = url.replace('/upload/', `/upload/fl_attachment:${filename}/`);
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = filename + '.jpg'; 
                downloadLink.textContent = 'Descargar';
                downloadLink.className = 'download-button';
                photoContainer.appendChild(img);
                photoContainer.appendChild(downloadLink);
                slide.appendChild(photoContainer);
                galleryList.appendChild(slide);
            });
            if (splide) { splide.destroy(true); }
            if (photoUrls.length > 0) {
                 splide = new Splide('#image-carousel', {
                    type: 'loop', perPage: 3, focus: 'center', gap: '1rem',
                    breakpoints: { 768: { perPage: 1 } },
                }).mount();
            }
        } catch (error) {
            console.error('Error al cargar la galería:', error);
        }
    }

    // Función de inicialización
    async function initialize() {
        await startCamera();
        await checkForMultipleCameras();
        await loadPhotos();
        video.style.transform = 'scaleX(-1)';
    }
    
    initialize();
});