#!/bin/bash
set -e

echo "Stopping itpros-wordaday service..."
systemctl stop itpros-wordaday 2>/dev/null || true
systemctl disable itpros-wordaday 2>/dev/null || true

rm -rf /opt/itpros-wordaday/server
rm -rf /opt/itpros-wordaday/public
echo "Old application files removed."
