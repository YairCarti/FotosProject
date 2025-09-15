// Cargar las variables de entorno del archivo .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middlewares
app.use(cors());
// Servir los archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static('public'));

// Configurar Multer para guardar la imagen en la memoria temporalmente
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- RUTAS DE LA API ---

// Ruta para subir una foto
app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo.' });
  }

  // Usar un stream para subir el buffer del archivo a Cloudinary
  let cld_upload_stream = cloudinary.uploader.upload_stream(
    {
      folder: 'fiesta_fotos', // Carpeta en Cloudinary donde se guardarán
      public_id: `foto_${Date.now()}`, // Nombre único para la foto
      resource_type: 'image',
    },
    (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error al subir la imagen.' });
      }
      res.status(200).json({ message: 'Foto subida con éxito!', url: result.secure_url });
    }
  );

  streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
});

// Ruta para obtener todas las fotos
app.get('/photos', async (req, res) => {
  try {
    const { resources } = await cloudinary.search
      .expression('folder:fiesta_fotos') // Busca en la carpeta especificada
      .sort_by('created_at', 'desc') // Ordena por fecha de creación descendente
      .max_results(100)
      .execute();
    
    const photoUrls = resources.map(file => file.secure_url);
    res.json(photoUrls);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener las fotos.' });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});