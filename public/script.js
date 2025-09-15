document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos del DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const gallery = document.getElementById('gallery');
    const loader = document.getElementById('loader');

    // Vistas principales
    const cameraView = document.getElementById('cameraView');
    const previewContainer = document.getElementById('previewContainer');

    // Botones
    const snapButton = document.getElementById('snapButton');
    const confirmButton = document.getElementById('confirmButton');
    const cancelButton = document.getElementById('cancelButton');

    // Elemento para la imagen de vista previa
    const previewImage = document.getElementById('previewImage');

    const BACKEND_URL = ''; // Se usa la misma URL del sitio
    let photoBlob = null; // Variable para guardar temporalmente la foto tomada

    // 1. Iniciar la cámara
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;
        } catch (err) {
            console.error("Error al acceder a la cámara: ", err);
            alert("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
        }
    }

    // 2. Lógica al presionar "Tomar Foto"
    snapButton.addEventListener('click', () => {
        // Dibujar la imagen del video en el canvas
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir el canvas a un Blob (archivo) y guardarlo en nuestra variable
        canvas.toBlob(blob => {
            photoBlob = blob;
            // Mostrar la imagen en la vista previa
            previewImage.src = URL.createObjectURL(blob);
        }, 'image/jpeg');

        // Cambiar de vista: ocultar cámara y mostrar vista previa
        cameraView.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    });

    // 3. Lógica al presionar "Cancelar"
    cancelButton.addEventListener('click', () => {
        // Limpiar la foto guardada
        photoBlob = null;
        // Volver a la vista de la cámara
        previewContainer.classList.add('hidden');
        cameraView.classList.remove('hidden');
    });

    // 4. Lógica al presionar "Confirmar"
    confirmButton.addEventListener('click', () => {
        if (photoBlob) {
            uploadPhoto(photoBlob);
        }
    });

    // 5. Función para subir la foto al backend
    async function uploadPhoto(blob) {
        const formData = new FormData();
        formData.append('photo', blob, 'fiesta-foto.jpg');

        // Mostrar el loader y ocultar los botones de la vista previa
        previewContainer.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData,
            });

            // ... dentro de la función uploadPhoto ...
            if (!response.ok) {
                throw new Error('La foto no se pudo subir.');
            }

            // Si la foto se sube, ESPERAMOS a que la galería se recargue
            await loadPhotos(); // <--- ¡ESTA ES LA SOLUCIÓN!
            // ...

        } catch (error) {
            console.error('Error al subir la foto:', error);
            alert('Hubo un problema al subir tu foto. Inténtalo de nuevo.');
        } finally {
            // Al terminar, volvemos a la vista de la cámara
            loader.classList.add('hidden');
            cameraView.classList.remove('hidden');
            photoBlob = null; // Limpiamos la variable
        }
    }

    // 6. Cargar todas las fotos en la galería (Versión Mejorada)
async function loadPhotos() {
    try {
        const response = await fetch(`${BACKEND_URL}/photos`);
        if (!response.ok) throw new Error('No se pudo cargar la galería.');
        
        const photoUrls = await response.json();
        
        gallery.innerHTML = ''; 

        photoUrls.forEach((url, index) => {
            // Nombre de archivo que queremos
            const filename = `fiesta_foto_${index + 1}`;
            
            // Creamos la URL de descarga, añadiendo el nombre del archivo deseado
            // Cloudinary lo usará al momento de descargar.
            const downloadUrl = url.replace('/upload/', `/upload/fl_attachment:${filename}/`);

            const photoContainer = document.createElement('div');
            photoContainer.className = 'photo-container';

            const img = document.createElement('img');
img.src = url;

            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            // El atributo download se vuelve redundante pero es buena práctica mantenerlo
            downloadLink.download = filename + '.jpg'; 
            
            downloadLink.textContent = 'Descargar';
            downloadLink.className = 'download-button';

            photoContainer.appendChild(img);
            photoContainer.appendChild(downloadLink);

            gallery.appendChild(photoContainer);
        });

    } catch (error) {
        console.error('Error al cargar la galería:', error);
    }
}

    // Iniciar todo al cargar la página
    startCamera();
    loadPhotos();
});