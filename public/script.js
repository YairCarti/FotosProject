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
    
    // Variables globales
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

    // Función para verificar si hay múltiples cámaras
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

    // --- LISTENER DEL BOTÓN DE TOMAR FOTO (CON LA CORRECCIÓN) ---
    snapButton.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Si estamos usando la cámara frontal (modo espejo), volteamos el canvas al dibujar
        if (facingMode === 'user') {
            context.save();
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.restore();
        } else {
            // Si es la cámara trasera, la dibujamos normal
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // El resto del proceso no cambia
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
            // ... dentro de la función loadPhotos ...

photoUrls.forEach((url, index) => {
    const slide = document.createElement('li');
    slide.className = 'splide__slide';

    const photoContainer = document.createElement('div');
    photoContainer.className = 'photo-container';
    
    // 1. La foto del invitado (capa base)
    const img = document.createElement('img');
    img.src = url;

    // --- NUEVO: Crear el elemento para la imagen del marco ---
    const frameOverlay = document.createElement('img');
    frameOverlay.src = 'marco-fiesta.png'; // Ruta a tu archivo en la carpeta public
    frameOverlay.className = 'photo-frame-overlay';
    // --- FIN DE LO NUEVO ---

    // 3. El botón de descarga
    const filename = `fiesta_foto_${index + 1}`;
    const downloadUrl = url.replace('/upload/', `/upload/fl_attachment:${filename}/`);
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = filename + '.jpg'; 
    downloadLink.textContent = 'Descargar';
    downloadLink.className = 'download-button';

    // --- ORDEN DE APILAMIENTO ---
    photoContainer.appendChild(img);          // Primero la foto
    photoContainer.appendChild(frameOverlay); // Luego el marco encima
    photoContainer.appendChild(downloadLink); // Finalmente el botón, encima de todo
    
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