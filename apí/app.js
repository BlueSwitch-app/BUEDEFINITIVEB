const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApi } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config();

// Importar funciones de análisis desde otro directorio
const calculateCO2 = require('../Analytics/CO2Analytics');
const calculateCO2forDevice = require('../Analytics/CO2AnalyticsperDev');
const calculateWatts = require('../Analytics/WattsAnalytics');

// Initialize app
const app = express();
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dkjlygxse",
  api_key: "111946664427639",
  api_secret: "iYwxs47jmdPmb-xCGtJfWKtg-F8"
});

// MongoDB connection
const uri = "mongodb+srv://crisesv4:Tanke1804.@cluster0.ejxv3jy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApi.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;
async function connectDB() {
  try {
    await client.connect();
    db = client.db("BlueSwitchData");
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error(err);
  }
}
connectDB();

// Collections
const usersCollection = () => db.collection("Users");
const devicesCollection = () => db.collection("Devices");
const discardDevicesCollection = () => db.collection("discardDevices");
const teamsCollection = () => db.collection("Teams");

// Helper functions
const uploadImage = async (imageUri) => {
  try {
    const result = await cloudinary.uploader.upload(imageUri);
    return result.secure_url;
  } catch (error) {
    throw new Error("Image upload failed");
  }
};

// Routes
app.get("/", (req, res) => {
  res.json({ mensaje: "Hello, World!" });
});

// User routes
app.post("/create_user", async (req, res) => {
  try {
    const { nombre, email, password, city, phone } = req.body;
    const user = { nombre, email, password, city, phone };
    await usersCollection().insertOne(user);
    res.json({ mensaje: "Usuario creado con exito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/get_user", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await usersCollection().findOne({ email }, { projection: { _id: 0 } });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/update_user", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });
    
    const updateFields = {};
    Object.keys(req.body).forEach(key => {
      if (key !== 'email' && req.body[key]) {
        updateFields[key] = req.body[key];
      }
    });
    
    const result = await usersCollection().updateOne({ email }, { $set: updateFields });
    if (result.matchedCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/upload_avatar", async (req, res) => {
  try {
    const { email, imageUri } = req.body;
    if (!email || !imageUri) {
      return res.status(400).json({ success: false, error: "Email and avatar are required" });
    }
    
    const avatar = await uploadImage(imageUri);
    await usersCollection().updateOne({ email }, { $set: { avatar } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Device routes
app.post("/crear-device", async (req, res) => {
  try {
    const { nombre, categoria, watts, color, team_code, email } = req.body;
    const requiredFields = ["nombre", "categoria", "watts", "color", "team_code", "email"];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ mensaje: "All fields are required" });
      }
    }
    
    const producto = {
      nombre,
      categoria,
      watts,
      color,
      state: true,
      email,
      team: team_code,
      stringid: uuidv4(),
      created_at: [[new Date().toISOString(), null]]
    };
    
    await devicesCollection().insertOne(producto);
    res.json({ mensaje: "Producto creado exitosamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error inesperado en el servidor", error: error.message });
  }
});

app.post("/get_devices", async (req, res) => {
  try {
    const { email, team_code } = req.body;
    if (!email && !team_code) {
      return res.status(400).json({ error: "Either email or team_code is required" });
    }
    
    const query = email ? { email } : { team: team_code };
    const devices = await devicesCollection().find(query, { projection: { _id: 0 } }).toArray();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/update-status", async (req, res) => {
  try {
    const { id, status, argument } = req.body;
    if (id === undefined || status === undefined) {
      return res.status(400).json({ error: 'Faltan id o status' });
    }
    
    const device = await devicesCollection().findOne({ stringid: id });
    if (!device) {
      return res.status(404).json({ error: 'Dispositivo no encontrado' });
    }
    
    if (argument === "Switch") {
      let historial = device.created_at || [];
      const now = new Date().toISOString();
      
      if (device.state === status) {
        return res.json({ mensaje: 'El estado ya está actualizado' });
      }
      
      if (status === true) {
        historial.push([now, null]);
      } else if (status === false && historial.length > 0 && historial[historial.length - 1][1] === null) {
        historial[historial.length - 1][1] = now;
      }
      
      await devicesCollection().updateOne(
        { stringid: id },
        { $set: { state: status, created_at: historial } }
      );
      return res.json({ mensaje: 'Estado y fechas actualizados correctamente' });
    } 
    else if (argument === "Delete") {
      await discardDevicesCollection().insertOne(device);
      await devicesCollection().deleteOne({ stringid: id });
      return res.json({ mensaje: 'Dispositivo eliminado correctamente' });
    } 
    else if (argument === "Favorite") {
      const newStatus = !device.favorite;
      await devicesCollection().updateOne(
        { stringid: id },
        { $set: { favorite: newStatus } }
      );
      return res.json({ mensaje: 'Estado actualizado correctamente' });
    } 
    else {
      return res.json({ mensaje: 'No se ejecutó porque el argumento no es valido' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/read-CO2", async (req, res) => {
  try {
    const { email, team_code } = req.body;
    if (!email && !team_code) {
      return res.status(400).json({ error: "Email or team_code required" });
    }
    
    const query = email ? { email } : { team: team_code };
    const devices = await devicesCollection().find(query, { projection: { _id: 0 } }).toArray();
    const { totalCO2, maxDeviceInfo } = calculateCO2(devices);
    res.json({ total_CO2: totalCO2, device_mas_CO2: maxDeviceInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/read_perDev", async (req, res) => {
  try {
    const { data } = req.body;
    const CO2 = calculateCO2forDevice(data);
    res.json(CO2);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/readstatisdics_peruser", async (req, res) => {
  try {
    const { email, team_code } = req.body;
    if (!email || !team_code) {
      return res.status(400).json({ success: false, error: "Email and team_code are required" });
    }
    
    const statistics = await devicesCollection()
      .find({ email, team: team_code }, { projection: { _id: 0 } })
      .toArray();
    
    if (statistics.length === 0) {
      return res.json({
        success: true,
        data: { CO2: 0, numdevices: 0, trees: 0, watts: 0 }
      });
    }
    
    // Corrección: Usar calculateCO2 para obtener el total de CO2
    const { totalCO2 } = calculateCO2(statistics);
    const Watts = calculateWatts(statistics);
    const co2Value = totalCO2;
    const treesValue = Math.ceil(co2Value / 22);
    
    res.json({
      success: true,
      data: {
        CO2: co2Value,
        numdevices: statistics.length,
        trees: treesValue,
        watts: Watts || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Team routes
app.post('/create_team', async (req, res) => {
  try {
    const { team_name, email } = req.body;
    const team = {
      Name: team_name,
      StringId: uuidv4(),
      Members: [{ email, role: "admin" }]
    };
    
    await teamsCollection().insertOne(team);
    res.json({ mensaje: "Equipo creado con éxito", team });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/join_team', async (req, res) => {
  try {
    const { team_name, email, team_code } = req.body;
    const team = await teamsCollection().findOne({ Name: team_name, StringId: team_code });
    
    if (!team) {
      return res.status(400).json({ mensaje: "El equipo no existe o el código es incorrecto" });
    }
    
    const isMember = team.Members.some(member => member.email === email);
    if (isMember) {
      return res.status(400).json({ mensaje: "Ya eres miembro del equipo" });
    }
    
    await teamsCollection().updateOne(
      { Name: team_name, StringId: team_code },
      { $push: { Members: { email, role: 'member' } } }
    );
    
    res.json({ mensaje: "Te uniste al equipo con éxito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/read_teams", async (req, res) => {
  try {
    const { email } = req.body;
    const teamsCursor = teamsCollection().find({ 'Members.email': email });
    const teams = [];
    
    await teamsCursor.forEach(team => {
      const member = team.Members.find(m => m.email === email);
      if (member) {
        teams.push({
          name: team.Name,
          code: team.StringId,
          role: member.role
        });
      }
    });
    
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/get_members", async (req, res) => {
  try {
    const { team_code } = req.body;
    if (!team_code) {
      return res.status(400).json({ mensaje: "El código del equipo es requerido" });
    }
    
    const team = await teamsCollection().findOne({ StringId: team_code });
    if (!team) {
      return res.status(404).json({ mensaje: "El equipo no existe" });
    }
    
    res.json({ members: team.Members || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/update_members", async (req, res) => {
  try {
    const { teamcode, email, action } = req.body;
    if (!teamcode || !email) {
      return res.status(400).json({ mensaje: "teamcode y email requeridos" });
    }
    
    if (action === "promote") {
      await teamsCollection().updateOne(
        { StringId: teamcode, 'Members.email': email },
        { $set: { 'Members.$.role': 'assistant' } }
      );
      return res.json({ mensaje: "El usuario ha sido promovido a asistente" });
    } 
    else if (action === "demote") {
      await teamsCollection().updateOne(
        { StringId: teamcode, 'Members.email': email },
        { $set: { 'Members.$.role': 'member' } }
      );
      return res.json({ mensaje: "El usuario ha sido degradado a miembro" });
    } 
    else if (action === "delete") {
      await teamsCollection().updateOne(
        { StringId: teamcode },
        { $pull: { Members: { email } } }
      );
      return res.json({ mensaje: "El usuario ha sido eliminado del equipo" });
    } 
    else {
      return res.status(400).json({ mensaje: "La acción no es válida" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/delete_team", async (req, res) => {
  try {
    const { teamcode } = req.body;
    if (!teamcode) {
      return res.status(400).json({ mensaje: "El código del equipo es requerido" });
    }
    
    await teamsCollection().deleteOne({ StringId: teamcode });
    res.json({ mensaje: "El equipo ha sido eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/leave_team", async (req, res) => {
  try {
    const { email, teamcode } = req.body;
    
    // Remove user from team
    await teamsCollection().updateOne(
      { StringId: teamcode },
      { $pull: { Members: { email } } }
    );
    
    // Move user's devices to discard collection
    const devices = await devicesCollection()
      .find({ email, team: teamcode })
      .toArray();
    
    if (devices.length > 0) {
      await discardDevicesCollection().insertMany(
        devices.map(d => {
          const { _id, ...device } = d;
          return device;
        })
      );
      
      // Update devices to remove team association
      await devicesCollection().updateMany(
        { email, team: teamcode },
        { $set: { team: "no_team" } }
      );
    }
    
    res.json({ mensaje: "El usuario ha dejado el equipo" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});