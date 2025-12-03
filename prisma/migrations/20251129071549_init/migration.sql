-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "registrationNo" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vin" TEXT,
    "ownerId" TEXT,
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "lastSeen" TIMESTAMP(3),
    "fuelCapacity" DOUBLE PRECISION,
    "odometer" DOUBLE PRECISION DEFAULT 0,
    "lastOdometer" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "imei" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "ignition" BOOLEAN NOT NULL,
    "motion" BOOLEAN NOT NULL,
    "power" DOUBLE PRECISION,
    "charge" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION,
    "todayDistance" DOUBLE PRECISION,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousFuel" DOUBLE PRECISION,
    "currentFuel" DOUBLE PRECISION,
    "delta" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "suspicion" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tyre" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "serial" TEXT,
    "installedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tyre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TyreHistory" (
    "id" TEXT NOT NULL,
    "tyreId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TyreHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "polygon" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceAlert" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT,
    "vehicleId" TEXT,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filePath" TEXT,
    "expiryDate" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "distanceKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "response" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rating" TEXT NOT NULL,
    "speedEvents" INTEGER NOT NULL DEFAULT 0,
    "brakeEvents" INTEGER NOT NULL DEFAULT 0,
    "idleEvents" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stop" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_imei_key" ON "Vehicle"("imei");

-- CreateIndex
CREATE UNIQUE INDEX "Geofence_name_key" ON "Geofence"("name");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tyre" ADD CONSTRAINT "Tyre_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TyreHistory" ADD CONSTRAINT "TyreHistory_tyreId_fkey" FOREIGN KEY ("tyreId") REFERENCES "Tyre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceAlert" ADD CONSTRAINT "GeofenceAlert_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceAlert" ADD CONSTRAINT "GeofenceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverScore" ADD CONSTRAINT "DriverScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverScore" ADD CONSTRAINT "DriverScore_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stop" ADD CONSTRAINT "Stop_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
