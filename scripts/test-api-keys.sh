#!/bin/bash

# ============================================
# Script para probar los endpoints de API Keys
# ============================================

BASE_URL="http://localhost:3000/api"

echo "🧪 Testing API Keys Management Endpoints"
echo "=========================================="

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Actualizar API key de Gemini
echo -e "\n${YELLOW}1️⃣  Actualizando API key de Gemini...${NC}"
curl -X POST "$BASE_URL/api-key/update" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "gemini",
    "apiKey": "AIzaSyBx88IXjw4nOEH7Wdxzdle-4tmbY_9wZZ8",
    "description": "Google Gemini Vision API para OCR de boletas"
  }' | jq '.'

# 2. Listar todas las API keys
echo -e "\n${YELLOW}2️⃣  Listando todas las API keys...${NC}"
curl "$BASE_URL/api-key" | jq '.'

# 3. Obtener información de la API key de Gemini
echo -e "\n${YELLOW}3️⃣  Obteniendo info de API key Gemini...${NC}"
curl "$BASE_URL/api-key/gemini" | jq '.'

# 4. Verificar si existe API key activa
echo -e "\n${YELLOW}4️⃣  Verificando si existe API key activa...${NC}"
curl "$BASE_URL/api-key/gemini/check" | jq '.'

# 5. Desactivar la API key
echo -e "\n${YELLOW}5️⃣  Desactivando API key (OPCIONAL)...${NC}"
# Descomenta para ejecutar
# curl -X POST "$BASE_URL/api-key/gemini/deactivate" | jq '.'

# 6. Probar con otra key ficticia
echo -e "\n${YELLOW}6️⃣  Actualizando con otra key (test)...${NC}"
curl -X POST "$BASE_URL/api-key/update" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "gemini",
    "apiKey": "AIzaSyNewKeyHereForTesting123456789",
    "description": "Nueva key de prueba"
  }' | jq '.'

# 7. Verificar cambios
echo -e "\n${YELLOW}7️⃣  Verificando key actualizada...${NC}"
curl "$BASE_URL/api-key/gemini" | jq '.'

echo -e "\n${GREEN}✅ Tests completados${NC}"
