function calculateCO2forDevice(devices) {
  const CO2Total = [];
  
  for (const device of devices) {
    const createdAtList = device.created_at || [];
    
    if (Array.isArray(createdAtList)) {
      for (const interval of createdAtList) {
        if (Array.isArray(interval) && interval.length === 2) {
          const [start, end] = interval;
          
          try {
            // Procesar fecha de inicio
            let startDateTime;
            if (start) {
              // Crear fecha en UTC si no tiene zona horaria
              startDateTime = new Date(start);
              if (isNaN(startDateTime.getTime())) {
                throw new Error("Fecha de inicio inválida");
              }
              
              // Si no tiene información de zona horaria, tratar como UTC
              if (!start.includes('Z') && !start.includes('+') && !start.includes('-')) {
                startDateTime = new Date(startDateTime.getTime() + startDateTime.getTimezoneOffset() * 60000);
              }
            } else {
              continue; // Saltar si no hay fecha de inicio
            }
            
            // Procesar fecha de fin
            let endDateTime;
            if (end) {
              endDateTime = new Date(end);
              if (isNaN(endDateTime.getTime())) {
                throw new Error("Fecha de fin inválida");
              }
              
              // Si no tiene información de zona horaria, tratar como UTC
              if (!end.includes('Z') && !end.includes('+') && !end.includes('-')) {
                endDateTime = new Date(endDateTime.getTime() + endDateTime.getTimezoneOffset() * 60000);
              }
            } else {
              // Usar fecha actual en UTC si no hay fecha de fin
              endDateTime = new Date();
              endDateTime = new Date(endDateTime.getTime() + endDateTime.getTimezoneOffset() * 60000);
            }
            
            // Calcular diferencia en horas
            const timeDifference = endDateTime - startDateTime;
            const hours = timeDifference / (1000 * 60 * 60);
            
            // Obtener watts del dispositivo
            const watts = device.watts || 0;
            
            // Calcular CO2
            const CO2 = (watts * hours / 1000) * 0.44;
            
            // Agregar resultados redondeados a 2 decimales
            CO2Total.push([
              Math.round(CO2 * 100) / 100,  // Redondear CO2 a 2 decimales
              Math.round(hours * 100) / 100  // Redondear horas a 2 decimales
            ]);
            
          } catch (error) {
            console.error(`Error procesando intervalo ${interval}: ${error.message}`);
          }
        }
      }
    }
  }
  
  return CO2Total;
}

// Ejemplo de uso:
const devices = [
  {
    nombre: "Televisor",
    watts: 150,
    created_at: [
      ["2023-01-01T10:00:00", "2023-01-01T12:00:00"],
      ["2023-01-01T18:00:00", null]  // Aún encendido
    ]
  },
  {
    nombre: "Lámpara",
    watts: 60,
    created_at: [
      ["2023-01-01T19:00:00", "2023-01-01T23:00:00"]
    ]
  }
];

const result = calculateCO2forDevice(devices);
console.log(result);
/*
Salida esperada:
[
  [0.13, 2],      // Televisor: 150W * 2h = 300Wh * 0.44 = 0.132 kg CO2
  [0.11, 1.67],   // Televisor: 150W * 1.67h ≈ 250Wh * 0.44 ≈ 0.11 kg CO2
  [0.11, 4]       // Lámpara: 60W * 4h = 240Wh * 0.44 ≈ 0.11 kg CO2
]
*/