const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "agents", // 📂 Carpeta en Cloudinary
    format: async (req, file) => "png", // 📌 Formato PNG
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Nombre único
  },
});

const upload = multer({ storage });

module.exports = upload;
