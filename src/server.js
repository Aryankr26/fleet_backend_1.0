require('dotenv').config();
const app = require('./app');
const prisma = require('./prismaClient');
const vendorPoller = require('./services/vendorPoller');
const documentService = require('./services/documentService');
const cron = require('node-cron');

const PORT = process.env.PORT || 3000;
const ENABLE_VENDOR_POLLER = process.env.ENABLE_VENDOR_POLLER === 'true';


async function start() {
  try {
    await prisma.$connect();
    console.info('DB connected');
    app.listen(PORT, () => console.info(`Backend listening ${PORT}`));
    if (ENABLE_VENDOR_POLLER) { vendorPoller.start(); } else { console.info('Vendor poller disabled by ENABLE_VENDOR_POLLER'); }
    // daily document check at 02:00
    cron.schedule('0 2 * * *', async () => {
      console.info('Running document expiry check');
      await documentService.checkDocumentExpiries();
    });
    // run on startup
    await documentService.checkDocumentExpiries();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
start();
process.on('SIGINT', async () => {
  console.info('SIGINT received: shutting down gracefully');
  try { await prisma.$disconnect(); } catch(e){}
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.info('SIGTERM received: shutting down gracefully');
  try { await prisma.$disconnect(); } catch(e){}
  process.exit(0);
});
