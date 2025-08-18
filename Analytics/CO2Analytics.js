function calculateCO2(devices) {
  let CO2Total = 0;
  const deviceCO2 = {};  // CO2 por dispositivo
  const deviceEmails = {};  // Email por dispositivo
  
  for (const device of devices) {
    const deviceName = device.nombre || "Desconocido";
    const deviceEmail = device.email || "Desconocido";
    
    deviceCO2[deviceName] = 0;
    deviceEmails[deviceName] = deviceEmail;
    
    const createdAtList = device.created_at || [];
    
    if (Array.isArray(createdAtList)) {
      for (const interval of createdAtList) {
        if (Array.isArray(interval) && interval.length === 2) {
          const [start, end] = interval;
          
          try {
            // Procesar fecha de inicio
            let startDateTime;
            if (start) {
              startDateTime = new Date(start);
              if (isNaN(startDateTime.getTime())) {
                throw new Error("Fecha de inicio inválida");
              }
              // Si no tiene zona horaria, asumir UTC
              if (startDateTime.toString().indexOf('GMT') === -1) {
                startDateTime = new Date(startDateTime.getTime() + startDateTime.getTimezoneOffset() * 60000);
              }
            } else {
              continue;  // Saltar si no hay fecha de inicio
            }
            
            // Procesar fecha de fin
            let endDateTime;
            if (end) {
              endDateTime = new Date(end);
              if (isNaN(endDateTime.getTime())) {
                throw new Error("Fecha de fin inválida");
              }
              // Si no tiene zona horaria, asumir UTC
              if (endDateTime.toString().indexOf('GMT') === -1) {
                endDateTime = new Date(endDateTime.getTime() + endDateTime.getTimezoneOffset() * 60000);
              }
            } else {
              endDateTime = new Date();  // Usar fecha actual si no hay fin
            }
            
            // Calcular horas de diferencia
            const hours = (endDateTime - startDateTime) / (1000 * 60 * 60);
            
            // Obtener watts del dispositivo
            const watts = device.watts || 0;
            
            // Calcular CO2
            const CO2 = (watts * hours / 1000) * 0.44;
            CO2Total += CO2;
            deviceCO2[deviceName] += CO2;
          } catch (error) {
            console.error(`Error procesando intervalo ${interval}: ${error.message}`);
          }
        }
      }
    }
  }
  
  // Obtener dispositivo con más CO2
  let maxDeviceName = null;
  let maxDeviceEmail = null;
  
  if (Object.keys(deviceCO2).length > 0) {
    maxDeviceName = Object.keys(deviceCO2).reduce((a, b) => 
      deviceCO2[a] > deviceCO2[b] ? a : b
    );
    maxDeviceEmail = deviceEmails[maxDeviceName];
  }
  
  // Calcular total de CO2 con la lógica original
  let totalCO2;
  if (CO2Total > 0) {
    totalCO2 = Math.round(CO2Total * 1000) / 1000;  // Redondear a 3 decimales
  } else if (CO2Total < 0) {
    totalCO2 = 1;  // Esto parece un error en el original, pero lo mantenemos
  } else {
    totalCO2 = 0;
  }
  
  return {
    totalCO2,
    maxDeviceInfo: {
      nombre: maxDeviceName,
      email: maxDeviceEmail
    }
  };
}

// Ejemplo de uso:
const devices = [
  {
    nombre: "Televisor",
    email: "user1@example.com",
    watts: 150,
    created_at: [
      ["2023-01-01T10:00:00", "2023-01-01T12:00:00"],
      ["2023-01-01T18:00:00", null]  // Aún encendido
    ]
  },
  {
    nombre: "Lámpara",
    email: "user2@example.com",
    watts: 60,
    created_at: [
      ["2023-01-01T19:00:00", "2023-01-01T23:00:00"]
    ]
  }
];

const result = calculateCO2(devices);
console.log("Total CO2:", result.totalCO2);
console.log("Dispositivo con más CO2:", result.maxDeviceInfo);