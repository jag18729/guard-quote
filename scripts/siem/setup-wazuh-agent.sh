#!/bin/bash
# Wazuh Agent Setup for isaiah-pi (agent 005)
# Run as root: sudo bash setup-wazuh-agent.sh
set -euo pipefail

MANAGER_IP="100.111.113.35"  # pi2 Tailscale IP
AGENT_NAME="isaiah-pi"
AGENT_KEY="MDA1IGlzYWlhaC1waSBhbnkgZWI0MGQ4MGQ2NmY2ZjJkNDA0N2VmN2I5MzhmMWZhNTk4NDE4ZjU3ODU3YzU2NzcwYmRmZDc2NTUyZjFhZGI1Zg=="

echo "=== Wazuh Agent Setup for $AGENT_NAME ==="

# Detect architecture
ARCH=$(dpkg --print-architecture 2>/dev/null || echo "unknown")
echo "Architecture: $ARCH"

# Install Wazuh agent 4.x
if ! command -v /var/ossec/bin/wazuh-control &>/dev/null; then
    echo "Installing Wazuh agent..."
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" > /etc/apt/sources.list.d/wazuh.list
    apt-get update -qq
    WAZUH_MANAGER="$MANAGER_IP" apt-get install -y wazuh-agent
else
    echo "Wazuh agent already installed."
fi

# Import agent key
echo "Importing agent key..."
echo "y" | /var/ossec/bin/manage_agents -i "$AGENT_KEY"

# Configure manager IP
sed -i "s|<address>.*</address>|<address>$MANAGER_IP</address>|" /var/ossec/etc/ossec.conf

# Enable and start
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl restart wazuh-agent

# Verify
sleep 3
STATUS=$(systemctl is-active wazuh-agent)
echo ""
echo "=== Result ==="
echo "Agent: $AGENT_NAME (005)"
echo "Manager: $MANAGER_IP"
echo "Service: $STATUS"

if [ "$STATUS" = "active" ]; then
    echo "Wazuh agent is running. Check manager with:"
    echo "  ssh pi2 'sudo docker exec wazuh-manager /var/ossec/bin/agent_control -i 005'"
else
    echo "Something went wrong. Check: journalctl -u wazuh-agent -n 20"
fi
