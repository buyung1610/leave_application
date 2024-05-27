import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    cb(null, './uploads/'); // Direktori tempat menyimpan file yang diupload
  },
  filename: (req: Request, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nama file yang diupload
  }
});

const upload = multer({
  storage: storage,
  limits: { fieldSize: 10 * 1024 * 1024 }, // 5MB
  fileFilter: (req: Request, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const mimeType = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

export default upload;
