class Producto {
  constructor(data) {
    // Extraer datos del objeto o parámetros
    const {
      nombre,
      categoria,
      watts,
      color,
      state = true,
      created_at,
      email,
      favorite = false,
      team
    } = data;
    
    // Validar y asignar campos de texto
    this.nombre = this.validateAndTrim(nombre, "nombre");
    this.categoria = this.validateAndTrim(categoria, "categoria");
    this.color = this.validateAndTrim(color, "color");
    this.email = this.validateAndTrim(email, "email");
    this.team = this.validateAndTrim(team, "team");
    
    // Validar watts
    this.watts = this.validateWatts(watts);
    
    // Asignar valores booleanos
    this.state = Boolean(state);
    this.favorite = Boolean(favorite);
    
    // Manejar created_at
    this.created_at = created_at || [this.getCurrentDateTime()];
  }
  
  // Validar y limpiar campos de texto
  validateAndTrim(value, fieldName) {
    const stringValue = String(value || '').trim();
    if (stringValue.length === 0) {
      throw new Error(`El campo '${fieldName}' no puede estar vacío`);
    }
    return stringValue;
  }
  
  // Validar que watts sea positivo
  validateWatts(value) {
    const numValue = Number(value);
    if (isNaN(numValue) || numValue <= 0) {
      throw new Error('El valor de los watts debe ser positivo');
    }
    return numValue;
  }
  
  // Obtener fecha y hora actual en formato ISO
  getCurrentDateTime() {
    return new Date().toISOString();
  }
  
  // Método para convertir a objeto plano
  toObject() {
    return {
      nombre: this.nombre,
      categoria: this.categoria,
      watts: this.watts,
      color: this.color,
      state: this.state,
      created_at: this.created_at,
      email: this.email,
      favorite: this.favorite,
      team: this.team
    };
  }
}

// Ejemplo de uso:
try {
  // Crear producto con todos los campos
  const producto1 = new Producto({
    nombre: "  Televisor LED  ",
    categoria: "Electrodomésticos",
    watts: 150,
    color: "negro",
    email: "usuario@example.com",
    team: "equipo1"
  });
  
  console.log(producto1.toObject());
  /*
  Salida:
  {
    nombre: 'Televisor LED',
    categoria: 'Electrodomésticos',
    watts: 150,
    color: 'negro',
    state: true,
    created_at: ['2023-05-15T14:30:45.123Z'], // Fecha actual
    email: 'usuario@example.com',
    favorite: false,
    team: 'equipo1'
  }
  */
  
  // Crear producto con created_at personalizado
  const producto2 = new Producto({
    nombre: "Lámpara",
    categoria: "Iluminación",
    watts: 60,
    color: "blanco",
    state: false,
    created_at: ["2023-01-01T00:00:00.000Z"],
    email: "usuario@example.com",
    favorite: true,
    team: "equipo2"
  });
  
  console.log(producto2.created_at); // ["2023-01-01T00:00:00.000Z"]
  console.log(producto2.favorite); // true
  
  // Intentar crear producto con watts no positivo
  const invalidProducto = new Producto({
    nombre: "Ventilador",
    categoria: "Climatización",
    watts: -50, // Valor inválido
    color: "gris",
    email: "usuario@example.com",
    team: "equipo1"
  });
  // Lanza error: "El valor de los watts debe ser positivo"
  
} catch (error) {
  console.error(error.message);
}