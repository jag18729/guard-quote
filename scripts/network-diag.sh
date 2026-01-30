#!/bin/bash
# Network diagnostic for Anthropic API connectivity
# Run this AFTER disconnecting NordVPN

echo "=== Network Diagnostic ==="
echo "Date: $(date)"
echo ""

echo "1. Current IP (should be your ISP, not NordVPN):"
curl -s --max-time 5 ipinfo.io | grep -E '"ip"|"org"' || echo "   FAILED to reach ipinfo.io"
echo ""

echo "2. DNS Servers:"
scutil --dns | grep "nameserver" | head -5
echo ""

echo "3. DNS Resolution (via different servers):"
echo "   System DNS:"
nslookup api.anthropic.com 2>&1 | grep -E "Address|Name" | head -3
echo "   Google DNS (8.8.8.8):"
nslookup api.anthropic.com 8.8.8.8 2>&1 | grep -E "Address|Name" | head -3
echo "   Cloudflare DNS (1.1.1.1):"
nslookup api.anthropic.com 1.1.1.1 2>&1 | grep -E "Address|Name" | head -3
echo ""

echo "4. Direct HTTPS connection to Anthropic:"
curl -sI --max-time 10 https://api.anthropic.com 2>&1 | head -5
CURL_EXIT=$?
if [ $CURL_EXIT -ne 0 ]; then
    echo "   FAILED (exit code: $CURL_EXIT)"
    echo "   Error codes: 6=DNS fail, 7=Connection refused, 28=Timeout, 35=SSL error"
fi
echo ""

echo "5. TCP connection test (port 443):"
nc -zv -w 5 api.anthropic.com 443 2>&1
echo ""

echo "6. Route to Anthropic (first 5 hops):"
traceroute -m 5 -w 2 api.anthropic.com 2>&1
echo ""

echo "=== Summary ==="
if curl -s --max-time 5 https://api.anthropic.com > /dev/null 2>&1; then
    echo "Anthropic API: REACHABLE"
else
    echo "Anthropic API: BLOCKED or UNREACHABLE"
    echo ""
    echo "Likely causes:"
    echo "  - ISP blocking (call them or check terms)"
    echo "  - Pi-hole blocking (check http://192.168.2.70/admin)"
    echo "  - Router firewall rule"
    echo "  - DNS poisoning"
fi
