const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create users with different roles
  // Using password123 for all demo users
  const password = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@fleet.com' },
    update: { password },
    create: { 
      email: 'owner@fleet.com', 
      password, 
      name: 'Fleet Owner',
      role: 'owner'
    }
  });
  console.log('✅ Owner user:', owner.email);

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@fleet.com' },
    update: { password },
    create: { 
      email: 'supervisor@fleet.com', 
      password, 
      name: 'Fleet Supervisor',
      role: 'supervisor'
    }
  });
  console.log('✅ Supervisor user:', supervisor.email);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.com' },
    update: { password },
    create: { 
      email: 'admin@fleet.com', 
      password, 
      name: 'System Admin',
      role: 'admin'
    }
  });
  console.log('✅ Admin user:', admin.email);

  // Sample vehicles matching frontend data
  const vehiclesData = [
    { imei: '864512345678901', registrationNo: 'HR55AN2175', make: 'Tata', model: 'Prima', year: 2022, fuelCapacity: 400 },
    { imei: '864512345678902', registrationNo: 'HR47E2573', make: 'Ashok Leyland', model: 'Captain', year: 2021, fuelCapacity: 350 },
    { imei: '864512345678903', registrationNo: 'UP32BN9021', make: 'Militrack', model: 'Heavy', year: 2023, fuelCapacity: 450 },
    { imei: '864512345678904', registrationNo: 'MP04CE7712', make: 'Tata', model: 'Signa', year: 2022, fuelCapacity: 400 },
    { imei: '864512345678905', registrationNo: 'MH12RK5521', make: 'Ashok Leyland', model: 'AVTR', year: 2021, fuelCapacity: 380 },
    { imei: '864512345678906', registrationNo: 'HR55AM8082', make: 'Militrack', model: 'Cargo', year: 2023, fuelCapacity: 420 },
    { imei: '864512345678907', registrationNo: 'MH14GT2299', make: 'Ashok Leyland', model: 'Boss', year: 2020, fuelCapacity: 350 },
    { imei: '864512345678908', registrationNo: 'UP14DT9921', make: 'Tata', model: 'Ultra', year: 2022, fuelCapacity: 300 },
    { imei: '864512345678909', registrationNo: 'MP07BK4402', make: 'Militrack', model: 'Express', year: 2021, fuelCapacity: 380 },
    { imei: '864512345678910', registrationNo: 'HR55AN1941', make: 'Ashok Leyland', model: 'Ecomet', year: 2023, fuelCapacity: 320 },
    { imei: '864512345678911', registrationNo: 'MH43DF2003', make: 'Tata', model: 'LPT', year: 2022, fuelCapacity: 400 },
    { imei: '864512345678912', registrationNo: 'UP16CP7788', make: 'Militrack', model: 'Titan', year: 2021, fuelCapacity: 450 },
    { imei: '864512345678913', registrationNo: 'MP19KA6604', make: 'Ashok Leyland', model: 'Partner', year: 2020, fuelCapacity: 280 },
    { imei: '864512345678914', registrationNo: 'HR26DT9011', make: 'Tata', model: 'Yodha', year: 2023, fuelCapacity: 350 },
    { imei: '864512345678915', registrationNo: 'MH01AX9920', make: 'Militrack', model: 'Hauler', year: 2022, fuelCapacity: 420 },
    { imei: '864512345678916', registrationNo: 'TN09CD3421', make: 'Tata', model: 'Ace', year: 2021, fuelCapacity: 200 },
    { imei: '864512345678917', registrationNo: 'KA51MN7788', make: 'Ashok Leyland', model: 'Guru', year: 2023, fuelCapacity: 380 },
    { imei: '864512345678918', registrationNo: 'RJ14PQ5566', make: 'Militrack', model: 'Power', year: 2022, fuelCapacity: 400 },
    { imei: '864512345678919', registrationNo: 'GJ01RS4433', make: 'Tata', model: 'Intra', year: 2021, fuelCapacity: 250 },
    { imei: '864512345678920', registrationNo: 'DL8CTU9988', make: 'Ashok Leyland', model: 'Dost', year: 2020, fuelCapacity: 220 },
  ];

  // Sample positions for vehicles
  const positions = [
    { lat: 28.4595, lng: 77.0266 },
    { lat: 28.4089, lng: 77.0419 },
    { lat: 28.4744, lng: 77.5040 },
    { lat: 22.7196, lng: 75.8577 },
    { lat: 18.5204, lng: 73.8567 },
    { lat: 28.4087, lng: 76.9454 },
    { lat: 19.0760, lng: 72.8777 },
    { lat: 28.6139, lng: 77.2090 },
    { lat: 22.7196, lng: 75.8577 },
    { lat: 28.6692, lng: 77.4538 },
    { lat: 19.9975, lng: 73.7898 },
    { lat: 26.8467, lng: 80.9462 },
    { lat: 23.2599, lng: 77.4126 },
    { lat: 28.4089, lng: 77.3178 },
    { lat: 19.2183, lng: 72.9781 },
    { lat: 13.0827, lng: 80.2707 },
    { lat: 12.9716, lng: 77.5946 },
    { lat: 26.9124, lng: 75.7873 },
    { lat: 23.0225, lng: 72.5714 },
    { lat: 28.7041, lng: 77.1025 },
  ];

  const statuses = ['moving', 'stopped', 'idling', 'moving', 'stopped', 'moving', 'idling', 'moving', 'stopped', 'idling'];

  for (let i = 0; i < vehiclesData.length; i++) {
    const vData = vehiclesData[i];
    const pos = positions[i];
    const statusIdx = i % statuses.length;
    
    const vehicle = await prisma.vehicle.upsert({
      where: { imei: vData.imei },
      update: { 
        lastLat: pos.lat, 
        lastLng: pos.lng,
        lastSeen: new Date(),
        odometer: Math.floor(Math.random() * 50000) + 10000
      },
      create: {
        ...vData,
        ownerId: owner.id,
        lastLat: pos.lat,
        lastLng: pos.lng,
        lastSeen: new Date(),
        odometer: Math.floor(Math.random() * 50000) + 10000
      }
    });

    const speed = statuses[statusIdx] === 'moving' ? Math.floor(Math.random() * 60) + 20 : 0;
    const ignition = statuses[statusIdx] !== 'stopped';

    await prisma.telemetry.create({
      data: {
        vehicleId: vehicle.id,
        imei: vehicle.imei,
        timestamp: new Date(),
        latitude: pos.lat + (Math.random() - 0.5) * 0.01,
        longitude: pos.lng + (Math.random() - 0.5) * 0.01,
        speed,
        ignition,
        motion: speed > 0,
        power: 12.5 + Math.random(),
        totalDistance: vehicle.odometer,
        todayDistance: Math.floor(Math.random() * 200)
      }
    });

    console.log(`✅ Vehicle ${i + 1}: ${vehicle.registrationNo}`);
  }

  // Create sample geofences
  const geofences = [
    { name: 'Main Depot', type: 'circle', centerLat: 28.4595, centerLng: 77.0266, radius: 1000 },
    { name: 'Delhi Hub', type: 'circle', centerLat: 28.7041, centerLng: 77.1025, radius: 2000 },
    { name: 'Mumbai Terminal', type: 'circle', centerLat: 19.0760, centerLng: 72.8777, radius: 1500 },
  ];

  for (const gf of geofences) {
    await prisma.geofence.upsert({
      where: { name: gf.name },
      update: {},
      create: gf
    });
    console.log(`✅ Geofence: ${gf.name}`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Owner: owner@fleet.com / password123');
  console.log('   Supervisor: supervisor@fleet.com / password123');
  console.log('   Admin: admin@fleet.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });