#!/bin/bash

# Script para actualizar el frontend después de cambios
# Uso: ./update-frontend.sh

set -e

echo "🔄 Actualizando frontend..."
echo ""

cd frontend

echo "🏗️  Construyendo frontend..."
npm run build

echo ""
echo "♻️  Reiniciando servicio PM2..."
cd ..
pm2 restart formulario-frontend

echo ""
echo "✅ Frontend actualizado!"
echo ""
echo "📊 Estado:"
pm2 list | grep formulario-frontend

echo ""
echo "📝 Ver logs:"
echo "  pm2 logs formulario-frontend"
