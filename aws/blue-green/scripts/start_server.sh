#!/bin/bash
set -e

SERVICE_FILE="/etc/systemd/system/itpros-wordaday.service"

cat > "${SERVICE_FILE}" << 'EOF'
[Unit]
Description=IT Pros WordADay Go Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/itpros-wordaday
EnvironmentFile=/opt/itpros-wordaday/.env
ExecStart=/opt/itpros-wordaday/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable itpros-wordaday
systemctl start itpros-wordaday

echo "itpros-wordaday service started."
