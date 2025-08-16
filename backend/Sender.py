from flask import Flask, request, jsonify
from flask_cors import CORS
from Constructor.NewDeviceObject import Producto
from Constructor.CreateTeamObject import Team
from Constructor.CreateTeamObject import TeamMember
from Constructor.CreateUserObjet import User
from Constructor.UploadCloudinary import upload_image
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import uuid
from datetime import datetime
from  Analytics.CO2Analytics import CalculateCO2
from Analytics.CO2AnalyticsperDev import CalculateCO2forDevice
from Analytics.WattsAnalytics import calculateWatts
app = Flask(__name__)
CORS(app) 
uri = "mongodb+srv://crisesv4:Tanke1804.@cluster0.ejxv3jy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'))

db = client["BlueSwitchData"]
userscollection = db["Users"]
devicescollection = db["Devices"]
discardDevicesCollection= db["discardDevices"]
teamscollection= db["Teams"]
@app.route("/", methods=["GET"])
def hello():
    return jsonify({"mensaje": "Hello, World!"})
@app.route("/create_user", methods=["POST"])
def create_user():
    data = request.json
    try:
        user= User(
            nombre=data["nombre"],
            email=data["email"],
            password=data["password"],
            city=data["city"],
            phone=data["phone"]

        )
        userscollection.insert_one(user.__dict__)
        return jsonify({"mensaje": "Usuario creado con exito"})
    except Exception as e:
        return jsonify({"error": str(e)})
@app.route("/crear-device", methods=["POST"])
def crear_producto():
    data = request.get_json()

    if not data:
        return jsonify({"mensaje": "No se recibió información"}), 400

    # Validar campos requeridos
    campos_requeridos = ["nombre", "categoria", "watts", "color", "team_code", "email"]
    for campo in campos_requeridos:
        if campo not in data or data[campo] == "" or data[campo] == None:
            return jsonify({"mensaje": f"All fields are required"}), 400

    try:
        producto = Producto(
            nombre=data["nombre"],
            categoria=data["categoria"],
            watts=data["watts"],
            color=data["color"],
            state=True,
            email=data["email"],
             created_at=[] ,
            team= data["team_code"]
        )

        producto_dict = producto.model_dump(exclude_unset=False)
        producto_dict["stringid"] = str(uuid.uuid4())
        producto_dict["created_at"] = [[datetime.now().isoformat(), None]]

        try:
            devicescollection.insert_one(producto_dict)
            return jsonify({"mensaje": "Producto creado exitosamente"}), 200

        except Exception as e:
            return jsonify({"mensaje": "Error al guardar en la base de datos"}), 500

    except Exception as e:
        return jsonify({"mensaje": "Error inesperado en el servidor"}), 500
   
@app.route("/get_devices", methods=["POST"])
def get_devices():
    try:
        data = request.get_json()
        email = data.get("email")
        team_code = data.get("team_code") # Get the team_code from the request

        # Check if either email or team_code is provided
        if not email and not team_code:
            return jsonify({"error": "Either email or team_code is required"}), 400

        # Build the query based on which parameter is provided
        query = {}
        if email:
            query = {"email": email}
        elif team_code:
            query = {"team": team_code}
        
        # Execute the query
        devices = list(devicescollection.find(query, {"_id": False}))
        
        return jsonify(devices), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/read-CO2", methods=["POST"])
def read_CO2():
    try:
        data = request.get_json()
        email = data.get("email")
        team_code = data.get("team_code")  # Obtener team_code de la petición

        if not email and not team_code:
            return jsonify({"error": "Email is required"}), 400

        if not team_code:
            devices = list(devicescollection.find({"email": email}, {"_id": False}))
        else:
            devices = list(devicescollection.find({"team": team_code}, {"_id": False}))

        total_CO2, max_device_info = CalculateCO2(devices)

        return jsonify({
    "total_CO2": total_CO2,
    "device_mas_CO2": max_device_info
}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/update-status', methods=['PUT'])
def update_device_status():
    data = request.get_json()
    device_id = data.get('id')
    new_status = data.get('status')
    args = data.get('argument')

    if device_id is None or new_status is None:
        return jsonify({'error': 'Faltan id o status'}), 400

    try:
        if args == "Switch":
            # Buscar el dispositivo por ID
            device = devicescollection.find_one({'stringid': device_id})

            if not device:
                return jsonify({'error': 'Dispositivo no encontrado'}), 404

            estado_actual = device.get('state')
            historial = device.get('created_at', [])

            now = datetime.utcnow().isoformat()

            if estado_actual == new_status:
                return jsonify({'mensaje': 'El estado ya está actualizado'}), 200

            if new_status is True:
                # Si se apaga el dispositivo, se guarda la fecha de inicio
                historial.append([now, None])
            elif new_status is False:
                # Si se enciende, cerrar el último periodo
                if historial and historial[-1][1] is None:
                    historial[-1][1] = now

            # Actualizar estado y historial
            result = devicescollection.update_one(
                {'stringid': device_id},
                {'$set': {'state': new_status, 'created_at': historial}}
            )

            return jsonify({'mensaje': 'Estado y fechas actualizados correctamente'}), 200
        elif args == "Delete":
            device = devicescollection.find_one({'stringid': device_id})
    
            if not device:
                return jsonify({'error': 'Dispositivo no encontrado'}), 404

            try:
        # Insertar el dispositivo en la colección discardDevices
                discardDevicesCollection.insert_one(device)

        # Eliminar de la colección original
                devicescollection.delete_one({'stringid': device_id})

                return jsonify({'mensaje': 'Dispositivo eliminado correctamente'}), 200
            except Exception as e:
                return jsonify({'error': f'Error al descartar el dispositivo: {str(e)}'}), 500
        elif args == "Favorite":
    # Obtener el valor actual del campo 'favorite'
            device = devicescollection.find_one({'stringid': device_id})
            if device:
                current_status = device.get('favorite', False)  # Por defecto False si no existe
                new_status = not current_status  # Invertir el valor

        # Actualizar el campo con el nuevo estado
                result = devicescollection.update_one(
                    {'stringid': device_id},
                    {'$set': {'favorite': new_status}}
        )
            return jsonify({'mensaje': 'Estado actualizado correctamente'}), 200
        else:
            return jsonify({'mensaje': 'No se ejecutó porque el argumento no es valido'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/create_team', methods=['POST'])
def create_team():
    data = request.json
    team_name = data['team_name']
    user_email = data['email']  # suponiendo que el JSON trae el correo

    try:
        team = Team(
            Name=team_name,
            Members=[TeamMember(email=user_email, role="admin")]
        )

        teamscollection.insert_one(team.model_dump())

        return jsonify({
            "mensaje": "Equipo creado con éxito",
            "team": team.dict()
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400
@app.route('/join_team', methods=['POST'])
def join_team():
    data = request.json
    team_name = data['team_name']
    user_email = data['email']
    team_code = data['team_code']

    try:
        # Buscar el equipo exacto por nombre y código
        team = teamscollection.find_one({'Name': team_name, 'StringId': team_code})
        
        if not team:
            return jsonify({"mensaje": "El equipo no existe o el código es incorrecto"}), 400

        # Verificar si ya es miembro
        for member in team.get('Members', []):
            if member.get('email') == user_email:
                return jsonify({"mensaje": "Ya eres miembro del equipo"}), 400

        # Agregar como nuevo miembro
        teamscollection.update_one(
            {'Name': team_name, 'StringId': team_code},
            {'$push': {'Members': {'email': user_email, 'role': 'member'}}}
        )

        return jsonify({"mensaje": "Te uniste al equipo con éxito"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/read_teams", methods=['POST'])
def read_teams():
    data = request.json
    user_email = data['email']
    
    try:
        teams_cursor = teamscollection.find({'Members.email': user_email})
        teams = []

        for team in teams_cursor:
            for member in team.get('Members', []):
                if member.get('email') == user_email:
                    teams.append({
                        'name': team.get('Name'),
                        'code': team.get('StringId'),
                        'role': member.get('role')
                    })
                    break  # Ya lo encontramos, no necesitamos seguir con los demás miembros

        return jsonify({'teams': teams}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/get_members", methods=['POST'])
def get_members():
    data = request.json
    team_code= data['team_code']
    if not team_code:
        return jsonify({"mensaje": "El código del equipo es requerido"}), 400
    try:
        team = teamscollection.find_one({'StringId': team_code})
        if not team:
            return jsonify({"mensaje": "El equipo no existe"}), 404
        return jsonify({"members": team.get('Members', [])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/update_members", methods=['POST'])
def update_members():
    data = request.json
    team_code = data['teamcode']
    user_email = data['email']
    mode = data['action']

    if not team_code:
        return jsonify({"mensaje": "El código del equipo es requerido"}), 400
    if not user_email:
        return jsonify({"mensaje": "El correo electrónico del usuario es requerido"}), 400

    try:
        if mode == "promote":
            teamscollection.update_one(
                {'StringId': team_code, 'Members.email': user_email},
                {'$set': {'Members.$.role': 'assistant'}}
            )
            return jsonify({"mensaje": "El usuario ha sido promovido a asistente"}), 200
        elif mode == "demote":
            teamscollection.update_one(
                {'StringId': team_code, 'Members.email': user_email},
                {'$set': {'Members.$.role': 'member'}}
            )
            return jsonify({"mensaje": "El usuario ha sido degradado a miembro"}), 200
        elif mode == "delete":
            teamscollection.update_one(
                {'StringId': team_code},
                {'$pull': {'Members': {'email': user_email}}}
            )
            return jsonify({"mensaje": "El usuario ha sido eliminado del equipo"}), 200
        else:
            return jsonify({"mensaje": "La acción no es válida"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/delete_team", methods=['POST'])
def delete_team():
    data = request.json
    team_code = data['teamcode']
    if not team_code:
        return jsonify({"mensaje": "El código del equipo es requerido"}), 400
    try:
        teamscollection.delete_one({'StringId': team_code})
        return jsonify({"mensaje": "El equipo ha sido eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
import json

@app.route("/read_perDev", methods=['POST'])
def read_perDev():
    data = request.json
    
    devices = data["data"]
    try:
        CO2= CalculateCO2forDevice(devices)
        return jsonify(CO2), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/leave_team", methods=['POST'])
def leave_team():
    data = request.json
    user_email = data['email']
    team_code = data['teamcode']
    try:
        teamscollection.update_one({'StringId': team_code}, {'$pull': {'Members':{'email': user_email}}})
        result = list(devicescollection.find({"email": user_email, "team": team_code}))

# Quitar el _id para evitar errores de clave duplicada
        for doc in result:
            doc.pop("_id", None)

        discardDevicesCollection.insert_many(result)

        devicescollection.update_many(
    {"email": user_email, "team": team_code},
    {"$set": {"team": "no_team"}}
)
        return jsonify({"mensaje": "El usuario ha dejado el equipo"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/get_user", methods=['POST'])
def get_user_info():
    data = request.json
    email = data['email']
    try:
        user = userscollection.find_one({"email": email},{"_id": False})
        return jsonify(user), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/update_user", methods=["POST"])
def update_user():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400

    # Crear un diccionario solo con los campos que no estén vacíos
    update_fields = {k: v for k, v in data.items() if v and k != "email"}

    result = userscollection.update_one({"email": email}, {"$set": update_fields})

    if result.matched_count > 0:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "error": "User not found"}), 404
@app.route("/upload_avatar", methods=["POST"])
def upload_avatar():
    data = request.get_json()
    email = data.get("email")
    imageUri = data.get("imageUri")
    if not email or not imageUri:
        return jsonify({"success": False, "error": "Email and avatar are required"}),400
    
    try:
        avatar=upload_image(imageUri)
        userscollection.update_one({"email": email}, {"$set": {"avatar": avatar}})
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
import math
@app.route("/readstatisdics_peruser", methods=["POST"])
def statistics_per_user():
    data = request.get_json()
    email = data.get("email")
    team_code= data.get("team_code")
    if not email or not team_code:
        return jsonify({"success": False, "error": "Email and team_code are required"}),400
    try:
        statistics = list(devicescollection.find({"email": email, "team": team_code}, {"_id": False}))
    
        if not statistics:  # Si no hay dispositivos
            return jsonify({
            "success": True,
            "data": {
                "CO2": 0,
                "numdevices": 0,
                "trees": 0,
                "watts": 0
            }
        }), 200

        CO2 = CalculateCO2forDevice(statistics)
        Watts = calculateWatts(statistics)

        co2_value = CO2[0][0] if CO2 and CO2[0][0] else ''
        trees_value = math.ceil(co2_value / 22) if co2_value else ''

        return jsonify({
        "success": True,
        "data": {
            "CO2": co2_value,
            "numdevices": len(statistics),
            "trees": trees_value,
            "watts": Watts if Watts else ''
        }
    }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
        

if __name__ == "__main__":
    # host='0.0.0.0' para permitir conexiones externas (útil con emuladores o redes)
    app.run( port=5000, debug=False)
