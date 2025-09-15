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
    
    // --- NUEVOS ELEMENTOS Y VARIABLES PARA EL CAMBIO DE CÁMARA ---
    const switchCameraButton = document.getElementById('switchCameraButton');
    const BACKEND_URL = '';
    let photoBlob = null;
    let splide = null; // Para la instancia del carrusel
    let currentStream = null; // Para guardar el stream de video actual y poder detenerlo
    let facingMode = 'user'; // 'user' es la cámara frontal, 'environment' es la trasera

    // --- FUNCIÓN DE INICIO DE CÁMARA MODIFICADA ---
    async function startCamera() {
        // Detener cualquier stream de video anterior para liberar la cámara
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        // Definir las restricciones para la cámara que queremos
        const constraints = {
            audio: false,
            video: {
                facingMode: facingMode 
            }
        };

        try {
            // Pedir el nuevo stream de video
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            currentStream = stream; // Guardar el nuevo stream
        } catch (err) {
            console.error("Error al acceder a la cámara con facingMode: ", err);
            // Si falla (ej. en un PC de escritorio), intentamos el modo simple
            try {
                console.log("Intentando de nuevo con el modo simple de video...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                video.srcObject = stream;
                currentStream = stream;
            } catch (fallbackErr) {
                console.error("Error al acceder a la cámara en modo simple: ", fallbackErr);
                alert("No se pudo acceder a ninguna cámara. Asegúrate de dar los permisos necesarios.");
            }
        }
    }

    // --- NUEVA FUNCIÓN PARA VERIFICAR CÁMARAS DISPONIBLES ---
    async function checkForMultipleCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            if (videoDevices.length > 1) {
                // Si hay más de una cámara, mostramos el botón de cambio
                switchCameraButton.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Error al enumerar dispositivos: ", err);
        }
    }

    // Lógica al presionar "Tomar Foto" (sin cambios)
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
    
    // --- NUEVO EVENT LISTENER PARA EL BOTÓN DE CAMBIO DE CÁMARA ---
    switchCameraButton.addEventListener('click', () => {
        // Cambiar el modo de la cámara (de 'user' a 'environment' y viceversa)
        facingMode = (facingMode === 'user') ? 'environment' : 'user';
        // Voltear el video si es la cámara frontal (efecto espejo) o no
        video.style.transform = (facingMode === 'user') ? 'scaleX(-1)' : 'scaleX(1)';
        // Iniciar la cámara con la nueva configuración
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
            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('La foto no se pudo subir.');
            }
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
            if (splide) {
                splide.destroy(true);
            }
            if (photoUrls.length > 0) {
                 splide = new Splide('#image-carousel', {
                    type   : 'loop',
                    perPage: 3,
                    focus  : 'center',
                    gap    : '1rem',
                    breakpoints: {
                        768: {
                            perPage: 1,
                        },
                    },
                }).mount();
            }
        } catch (error) {
            console.error('Error al cargar la galería:', error);
        }
    }

    // --- NUEVA FUNCIÓN DE INICIALIZACIÓN DE LA APLICACIÓN ---
    async function initialize() {
        await checkForMultipleCameras(); // Primero, verificamos si hay múltiples cámaras
        await startCamera();             // Luego, iniciamos la cámara por primera vez
        await loadPhotos();              // Finalmente, cargamos la galería
        // Aplicar el efecto espejo inicial para la cámara frontal
        video.style.transform = 'scaleX(-1)';
    }
    
    initialize(); // Llamamos a la nueva función de inicialización para empezar todo
});