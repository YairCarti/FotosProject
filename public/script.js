document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
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
    const photoCountElement = document.getElementById('photoCount');

    // Variables globales
    const switchCameraButton = document.getElementById('switchCameraButton');
    const BACKEND_URL = '';
    let photoBlob = null;
    let splide = null;
    let currentStream = null;
    let facingMode = 'user';
    let photoCount = 0;

    // Función para actualizar contador de fotos
    function updatePhotoCount() {
        photoCountElement.textContent = photoCount;
        // Animación del contador
        photoCountElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            photoCountElement.style.transform = 'scale(1)';
        }, 200);
    }

    // Función de inicio de cámara
    async function startCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            audio: false,
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            currentStream = stream;

            // Agregar efectos visuales cuando la cámara esté lista
            video.addEventListener('loadedmetadata', () => {
                video.style.opacity = '0';
                video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
                setTimeout(() => {
                    video.style.transition = 'opacity 0.5s ease';
                    video.style.opacity = '1';
                }, 100);
            });

        } catch (err) {
            console.error("Error al acceder a la cámara con facingMode: ", err);
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                video.srcObject = stream;
                currentStream = stream;
            } catch (fallbackErr) {
                console.error("Error al acceder a la cámara en modo simple: ", fallbackErr);
                showNotification("No se pudo acceder a la cámara. Verifica los permisos.", 'error');
            }
        }
    }

    // Función para mostrar notificaciones
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? 'var(--gradient-danger)' : 'var(--gradient-button)',
            color: type === 'error' ? 'white' : 'var(--primary)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '10000',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transform: 'translateX(100%)',
            transition: 'var(--transition)',
            fontWeight: '600'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Función para verificar múltiples cámaras
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

    // Event Listeners
    snapButton.addEventListener('click', () => {
        // Animación del botón
        snapButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            snapButton.style.transform = 'scale(1)';
        }, 150);

        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Efecto de flash
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 9999;
            opacity: 0.8;
            pointer-events: none;
        `;
        document.body.appendChild(flash);

        setTimeout(() => {
            document.body.removeChild(flash);
        }, 150);

        // Capturar imagen
        if (facingMode === 'user') {
            context.save();
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.restore();
        } else {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        canvas.toBlob(blob => {
            photoBlob = blob;
            previewImage.src = URL.createObjectURL(blob);
        }, 'image/jpeg', 0.95);

        // Transición suave
        cameraView.style.opacity = '0';
        setTimeout(() => {
            cameraView.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            setTimeout(() => {
                previewContainer.style.opacity = '1';
            }, 50);
        }, 300);
    });

    // Cambiar cámara
    switchCameraButton.addEventListener('click', () => {
        facingMode = (facingMode === 'user') ? 'environment' : 'user';

        // Animación de rotación
        switchCameraButton.style.transform = 'translateX(-50%) scale(1.1) rotate(180deg)';
        setTimeout(() => {
            switchCameraButton.style.transform = 'translateX(-50%) scale(1) rotate(0deg)';
        }, 300);

        startCamera();
        showNotification('Cámara cambiada', 'success');
    });

    // Cancelar foto
    cancelButton.addEventListener('click', () => {
        photoBlob = null;

        previewContainer.style.opacity = '0';
        setTimeout(() => {
            previewContainer.classList.add('hidden');
            cameraView.classList.remove('hidden');
            cameraView.style.opacity = '1';
        }, 300);
    });

    // Confirmar y subir foto
    confirmButton.addEventListener('click', () => {
        if (photoBlob) {
            uploadPhoto(photoBlob);
        }
    });

    // Función de subida de foto
    async function uploadPhoto(blob) {
        const formData = new FormData();
        formData.append('photo', blob, 'fiesta-magica.jpg');

        // Mostrar loader con animación
        previewContainer.style.opacity = '0';
        setTimeout(() => {
            previewContainer.classList.add('hidden');
            loader.classList.remove('hidden');
        }, 300);

        try {
            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al subir la foto');
            }

            const result = await response.json();
            showNotification('¡Foto subida con éxito!', 'success');
            await loadPhotos();

        } catch (error) {
            console.error('Error al subir la foto:', error);
            showNotification('Error al subir la foto. Inténtalo de nuevo.', 'error');
        } finally {
            loader.classList.add('hidden');
            cameraView.classList.remove('hidden');
            cameraView.style.opacity = '1';
            photoBlob = null;
        }
    }

    // Cargar galería de fotos con descarga mejorada
    async function loadPhotos() {
        try {
            const response = await fetch(`${BACKEND_URL}/photos`);
            if (!response.ok) throw new Error('Error al cargar galería');

            const photoUrls = await response.json();
            photoCount = photoUrls.length;
            updatePhotoCount();

            galleryList.innerHTML = '';

            photoUrls.forEach((url, index) => {
                const slide = document.createElement('li');
                slide.className = 'splide__slide';

                const photoItem = document.createElement('div');
                photoItem.className = 'photo-item';

                const img = document.createElement('img');
                img.src = url;
                img.className = 'photo-image';
                img.loading = 'lazy';

                const overlay = document.createElement('div');
                overlay.className = 'photo-overlay';

                const actions = document.createElement('div');
                actions.className = 'photo-actions';

                const filename = `fiesta-magica-${index + 1}`;

                // =======================================================
                // AQUÍ ESTÁ LA ÚNICA CORRECCIÓN
                // Reemplazamos el <button> y su listener por una etiqueta <a> directa
                // =======================================================
                const downloadUrl = url.replace('/upload/', `/upload/fl_attachment:${filename}/`);

                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = filename + '.jpg';
                downloadLink.className = 'download-btn';
                downloadLink.innerHTML = `
                    <i class="fas fa-download"></i>
                    Descargar Foto
                `;

                actions.appendChild(downloadLink);
                photoItem.appendChild(img);
                photoItem.appendChild(overlay);
                photoItem.appendChild(actions);
                slide.appendChild(photoItem);
                galleryList.appendChild(slide);
            });

            // Destruir carrusel existente y crear uno nuevo
            if (splide) {
                splide.destroy(true);
            }

            if (photoUrls.length > 0) {
                splide = new Splide('#image-carousel', {
                    type: 'loop',
                    perPage: 3,
                    focus: 'center',
                    gap: '2rem',
                    autoplay: true,
                    interval: 5000,
                    pauseOnHover: true,
                    breakpoints: {
                        1024: { perPage: 2 },
                        768: { perPage: 1 }
                    },
                }).mount();

                // Agregar efectos adicionales al carrusel
                splide.on('moved', () => {
                    const activeSlides = document.querySelectorAll('.splide__slide.is-active .photo-item');
                    activeSlides.forEach(slide => {
                        slide.style.transform = 'scale(1.05)';
                        setTimeout(() => {
                            slide.style.transform = 'scale(1)';
                        }, 300);
                    });
                });
            }

        } catch (error) {
            console.error('Error al cargar la galería:', error);
            showNotification('Error al cargar la galería', 'error');
        }
    }

    // Función de inicialización
    async function initialize() {
        showNotification('¡Bienvenido a PhotoBooth Pro!', 'success');

        await startCamera();
        await checkForMultipleCameras();
        await loadPhotos();

        // Efectos de entrada
        const elements = document.querySelectorAll('.camera-card, .info-panel');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            setTimeout(() => {
                el.style.transition = 'all 0.6s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    // Agregar estilos adicionales para notificaciones
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        .notification {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .notification i {
            font-size: 1.1em;
        }
    `;
    document.head.appendChild(notificationStyles);

    // Inicializar aplicación 
    initialize();
});