class User {
  constructor(data = {}) {
    // Extraer datos del objeto o parámetros individuales
    const {
      nombre,
      email,
      password,
      phone,
      city,
      avatar = "https://res.cloudinary.com/dkjlygxse/image/upload/v1746846631/is-there-a-sniper-default-pfp-that-someone-made-v0-78az45pd9f6c1_ymnf4h.webp"
    } = data;
    
    // Validar y asignar cada campo
    this.nombre = this.validateAndTrim(nombre, "nombre");
    this.email = this.validateAndTrim(email, "email");
    this.password = this.validateAndTrim(password, "password");
    this.phone = this.validateAndTrim(phone, "phone");
    this.city = this.validateAndTrim(city, "city");
    this.avatar = this.validateAndTrim(avatar, "avatar");
  }
  
  // Método para validar y limpiar campos
  validateAndTrim(value, fieldName) {
    // Convertir a cadena si no lo es
    const stringValue = String(value || '');
    
    // Eliminar espacios al inicio y final
    const trimmedValue = stringValue.trim();
    
    // Validar que no esté vacío
    if (trimmedValue.length === 0) {
      throw new Error(`El campo '${fieldName}' no puede estar vacío`);
    }
    
    return trimmedValue;
  }
  
  // Método para convertir a objeto plano (similar a .dict() de Pydantic)
  toObject() {
    return {
      nombre: this.nombre,
      email: this.email,
      password: this.password,
      phone: this.phone,
      city: this.city,
      avatar: this.avatar
    };
  }
}

// Ejemplo de uso:
try {
  // Crear usuario con todos los campos
  const user1 = new User({
    nombre: "  Juan Pérez  ",
    email: "juan@example.com",
    password: "contraseña123",
    phone: "123456789",
    city: "Ciudad de México"
  });
  
  console.log(user1.toObject());
  /*
  Salida:
  {
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'contraseña123',
    phone: '123456789',
    city: 'Ciudad de México',
    avatar: 'https://res.cloudinary.com/dkjlygxse/image/upload/v1746846631/is-there-a-sniper-default-pfp-that-someone-made-v0-78az45pd9f6c1_ymnf4h.webp'
  }
  */
  
  // Crear usuario con avatar personalizado
  const user2 = new User({
    nombre: "María García",
    email: "maria@example.com",
    password: "miClaveSegura",
    phone: "987654321",
    city: "Buenos Aires",
    avatar: "https://ejemplo.com/avatar.jpg"
  });
  
  console.log(user2.avatar); // "https://ejemplo.com/avatar.jpg"
  
  // Intentar crear usuario con campo vacío
  const invalidUser = new User({
    nombre: "",
    email: "test@example.com",
    password: "123",
    phone: "456",
    city: "Ciudad"
  });
  // Lanza error: "El campo 'nombre' no puede estar vacío"
  
} catch (error) {
  console.error(error.message);
}