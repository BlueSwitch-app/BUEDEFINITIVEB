class TeamMember {
  constructor(email, role) {
    this.email = email;
    this.role = role;
  }
}

class Team {
  constructor(name) {
    // Validar y limpiar el nombre
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("El nombre no puede estar vacío");
    }
    
    this.Name = trimmedName;
    this.StringId = this.generateId();
    this.Members = [];
  }
  
  // Generar ID único similar a secrets.token_hex(6)
  generateId() {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 12; i++) { // 6 bytes = 12 caracteres hex
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  // Método para agregar miembros
  addMember(email, role) {
    this.Members.push(new TeamMember(email, role));
    return this;
  }
}

// Ejemplo de uso:
try {
  // Crear un equipo
  const myTeam = new Team("  Mi Equipo  ");
  console.log(myTeam.Name); // "Mi Equipo" (sin espacios)
  console.log(myTeam.StringId); // ID generado automáticamente
  
  // Agregar miembros
  myTeam.addMember("admin@example.com", "admin")
          .addMember("user@example.com", "member");
  
  console.log(myTeam.Members);
  /*
  Salida:
  [
    TeamMember { email: 'admin@example.com', role: 'admin' },
    TeamMember { email: 'user@example.com', role: 'member' }
  ]
  */
  
  // Intentar crear un equipo con nombre vacío
  const invalidTeam = new Team("   "); // Lanza error: "El nombre no puede estar vacío"
} catch (error) {
  console.error(error.message);
}