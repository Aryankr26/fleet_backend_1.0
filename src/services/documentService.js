const prisma = require('../prismaClient');

async function checkDocumentExpiries() {
  try {
    const now = new Date();
    const warn = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    const docs = await prisma.vehicleDocument.findMany({ where: { expiryDate: { gte: now, lte: warn } } });
    for (const d of docs) {
      await prisma.geofenceAlert.create({
        data: {
          geofenceId: null,
          vehicleId: d.vehicleId,
          message: `Document ${d.type} for vehicle ${d.vehicleId} expiring on ${d.expiryDate}`,
          severity: 'warning'
        }
      });
    }
    return docs.length;
  } catch (err) {
    console.error('documentService error', err);
    return 0;
  }
}

module.exports = { checkDocumentExpiries };