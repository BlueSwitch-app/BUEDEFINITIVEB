const express = require('express');
const { uploadImage } = require('./cloudinary');

const app = express();
app.use(express.json());

// Ruta para subir avatar
app.post("/upload_avatar", async (req, res) => {
  try {
    const { email, imageUri } = req.body;
    
    if (!email || !imageUri) {
      return res.status(400).json({ 
        success: false, 
        error: "Email y URI de imagen son requeridos" 
      });
    }
    
    // Subir imagen a Cloudinary
    const avatarUrl = await uploadImage(imageUri);
    
    // Actualizar usuario en la base de datos
    await usersCollection.updateOne(
      { email }, 
      { $set: { avatar: avatarUrl } }
    );
    
    res.json({ success: true, avatarUrl });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(3000, () => {
  console.log('Servidor iniciado en puerto 3000');
});