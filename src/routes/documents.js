const express = require('express');
const multer = require('multer');
const prisma = require('../prismaClient');
const auth = require('../middlewares/auth');
const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.use(auth);

router.get('/:vehicleId', async (req, res) => {
  const docs = await prisma.vehicleDocument.findMany({ where: { vehicleId: req.params.vehicleId } });
  res.json({ data: docs });
});

router.post('/:vehicleId', upload.single('file'), async (req, res) => {
  const { type, expiryDate } = req.body;
  const filePath = req.file ? req.file.path : null;
  const doc = await prisma.vehicleDocument.create({ data: { vehicleId: req.params.vehicleId, type, filePath, expiryDate: expiryDate ? new Date(expiryDate) : null } });
  res.status(201).json({ data: doc });
});

module.exports = router;