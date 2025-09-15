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

    // Función de inicio de cámara modificada
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

    // Función modificada con alertas de depuración
    async function checkForMultipleCameras() {
        try {
            alert("Paso 1: Buscando cámaras...");
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            alert(`Paso 2: Cámaras de video detectadas: ${videoDevices.length}`);
            
            let deviceLabels = videoDevices.map((device, index) => `Cámara ${index + 1}: ${device.label || 'Sin etiqueta (normal antes de dar permiso)'}`).join('\n');
            if (!deviceLabels) deviceLabels = "No se encontraron etiquetas.";
            alert(`Paso 3: Detalles de las cámaras:\n${deviceLabels}`);

            if (videoDevices.length > 1) {
                alert("Resultado: ¡Se detectaron varias cámaras! Mostrando el botón.");
                switchCameraButton.classList.remove('hidden');
            } else {
                alert("Resultado: Solo se detectó una cámara. El botón no se mostrará.");
            }
        } catch (err) {
            console.error("Error al enumerar dispositivos: ", err);
            alert(`Ocurrió un error al buscar cámaras: ${err.message}`);
        }
    }

    // Listener para tomar foto (sin cambios)
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
    
    // Listener para cambiar de cámara (sin cambios)
    switchCameraButton.addEventListener('click', () => {
        facingMode = (facingMode === 'user') ? 'environment' : 'user';
        video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
        startCamera();
    });

    // Lógica de Cancelar y Confirmar (sin cambios)
    cancelButton.addEventListener('click', () => {
        photoBlob = null;
        previewContainer.classList.add('hidden');
        cameraView.classList.remove('hidden');
    });
    confirmButton.addEventListener('click', () => { if (photoBlob) { uploadPhoto(photoBlob); } });

    // Función de subir foto (sin cambios)
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

    // Función de cargar galería con carrusel (sin cambios)
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

    // Función de inicialización modificada (EL ARREGLO PRINCIPAL)
    async function initialize() {
        // 1. Primero intentamos iniciar la cámara (esto fuerza el permiso)
        await startCamera();
        // 2. Después de tener permiso, revisamos cuántas cámaras hay
        await checkForMultipleCameras();
        // 3. Finalmente, cargamos la galería
        await loadPhotos();
        // Aplicamos el efecto espejo inicial para la cámara frontal
        video.style.transform = 'scaleX(-1)';
    }
    
    initialize();
});