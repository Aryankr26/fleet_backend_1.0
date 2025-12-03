/**
 * Parse Millitrack responses into normalized telemetry objects
 */
function parseMillitrackSingle(item) {
  const attributes = item.attributes || {};
  const ts = item.timestamps ? new Date(item.timestamps) : new Date();
  return {
    imei: item.deviceUniqueId || item.imei || null,
    timestamp: ts,
    latitude: Number(item.latitude ?? item.lat ?? item.latitud ?? 0),
    longitude: Number(item.longitude ?? item.lon ?? item.long ?? 0),
    speed: Number(item.speed ?? 0),
    ignition: Boolean(attributes.ignition ?? false),
    motion: Boolean(attributes.motion ?? false),
    power: attributes.power !== undefined ? Number(attributes.power) : null,
    charge: attributes.charge !== undefined ? Number(attributes.charge) : null,
    totalDistance: attributes.totalDistance !== undefined ? Number(attributes.totalDistance) : null,
    todayDistance: attributes.todayDistance !== undefined ? Number(attributes.todayDistance) : null,
    raw: item
  };
}

function parseMillitrackResponse(data) {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  return arr.map(parseMillitrackSingle);
}

module.exports = { parseMillitrackResponse, parseMillitrackSingle };