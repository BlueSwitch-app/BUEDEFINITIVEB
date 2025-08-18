function calculateWatts(devices) {
  // Verificar si hay dispositivos
  if (!devices || devices.length === 0) {
    return 0;
  }
  
  let totalWatts = 0;
  
  // Sumar los watts de todos los dispositivos
  for (const device of devices) {
    totalWatts += device.watts || 0; // Usar 0 si watts no está definido
  }
  
  // Calcular el promedio
  return totalWatts / devices.length;
}

// Ejemplo de uso:
const devices = [
  { nombre: "Televisor", watts: 150 },
  { nombre: "Lámpara", watts: 60 },
  { nombre: "Ventilador", watts: 80 },
  { nombre: "Computadora", watts: 200 }
];

const averageWatts = calculateWatts(devices);
console.log("Promedio de watts:", averageWatts); // (150+60+80+200)/4 = 122.5

// Ejemplo con array vacío
const emptyDevices = [];
const emptyResult = calculateWatts(emptyDevices);
console.log("Promedio con array vacío:", emptyResult); // 0

// Ejemplo con dispositivos sin watts
const incompleteDevices = [
  { nombre: "Dispositivo 1", watts: 100 },
  { nombre: "Dispositivo 2" }, // Sin watts
  { nombre: "Dispositivo 3", watts: 50 }
];

const incompleteResult = calculateWatts(incompleteDevices);
console.log("Promedio con datos incompletos:", incompleteResult); // (100+0+50)/3 = 50