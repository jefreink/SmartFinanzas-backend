#!/bin/bash

# 🔗 Script de Verificación MongoDB Atlas
# Ejecutar desde: /backend
# Uso: bash verify-mongodb-connection.sh

echo "=================================="
echo "🔗 Verificador de MongoDB Atlas"
echo "=================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ No se encontró .env${NC}"
    echo "   Por favor, crea .env basándote en .env.example"
    exit 1
fi

echo -e "${GREEN}✅ .env encontrado${NC}"
echo ""

# Leer variables del .env
export $(cat .env | grep -v '#' | xargs)

# Verificar variables necesarias
echo "📋 Verificando variables de entorno..."
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ DB_PASSWORD no está configurado${NC}"
    echo "   Actualiza .env con: DB_PASSWORD=tu_contraseña"
    exit 1
fi
echo -e "${GREEN}✅ DB_PASSWORD configurado${NC}"

if [ -z "$DB_USER" ]; then
    echo -e "${RED}❌ DB_USER no está configurado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ DB_USER: ${DB_USER}${NC}"

if [ -z "$DB_CLUSTER" ]; then
    echo -e "${RED}❌ DB_CLUSTER no está configurado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ DB_CLUSTER: ${DB_CLUSTER}${NC}"

echo ""
echo "🔐 Información de conexión:"
echo "   Usuario: $DB_USER"
echo "   Cluster: $DB_CLUSTER"
echo "   Contraseña: ****" # No mostrar la contraseña
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "   Descarga desde: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js instalado: $(node -v)${NC}"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm instalado: $(npm -v)${NC}"

echo ""
echo "📦 Verificando node_modules..."

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⏳ Instalando dependencias...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error al instalar dependencias${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${GREEN}✅ node_modules encontrado${NC}"
fi

echo ""
echo "🧪 Intentando conectar a MongoDB Atlas..."
echo "(Esto puede tardar unos segundos...)"
echo ""

# Crear script de test temporal
cat > test-connection.js << 'EOF'
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');

(async () => {
  try {
    console.log('⏳ Conectando a MongoDB Atlas...');
    console.log(`   URI: mongodb+srv://${process.env.DB_USER}:****@${process.env.DB_CLUSTER}`);
    
    await connectDB();
    
    console.log('');
    console.log('✅ CONEXIÓN EXITOSA!');
    console.log('');
    console.log('Próximos pasos:');
    console.log('1. Inicia el servidor: npm start');
    console.log('2. Prueba una API: http://localhost:5000/api/currencies');
    console.log('3. Verifica en MongoDB Atlas > Collections');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ ERROR DE CONEXIÓN:');
    console.error(error.message);
    console.error('');
    
    if (error.message.includes('DB_PASSWORD')) {
      console.error('🔴 Acción: Actualiza DB_PASSWORD en .env');
    } else if (error.message.includes('Authentication')) {
      console.error('🔴 Acción: Verifica usuario/contraseña en MongoDB Atlas');
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('🔴 Acción: Verifica que tu IP esté en Network Access en MongoDB Atlas');
    }
    
    process.exit(1);
  }
})();
EOF

# Ejecutar test
node test-connection.js
TEST_RESULT=$?

# Limpiar archivo temporal
rm -f test-connection.js

if [ $TEST_RESULT -ne 0 ]; then
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Ve a https://www.mongodb.com/cloud/atlas"
    echo "   2. Abre tu Cluster > Network Access"
    echo "   3. Asegúrate de agregar tu IP o 0.0.0.0/0 (para desarrollo)"
    echo "   4. Verifica Database Access > jefreink_db_user existe"
    echo ""
    exit 1
fi

exit 0
