#!/bin/bash
echo "🧪 Testing all connections..."

# Test local app
echo "📱 Testing local app..."
curl -s -o /dev/null -w "Local App: %{http_code}\n" http://localhost:3000
curl -s -o /dev/null -w "App Metrics: %{http_code}\n" http://localhost:3000/metrics

# Start port forwards if not running
echo "🔌 Starting port forwards..."
kubectl port-forward -n monitoring service/prometheus-service 9090:9090 > /dev/null 2>&1 &
kubectl port-forward -n monitoring service/grafana-service 3001:3001 > /dev/null 2>&1 &

sleep 3

# Test Kubernetes services
echo "☸️ Testing Kubernetes services..."
curl -s -o /dev/null -w "Prometheus: %{http_code}\n" http://localhost:9090
curl -s -o /dev/null -w "Grafana: %{http_code}\n" http://localhost:3001

echo ""
echo "🌐 Open these in your browser:"
echo "📱 Your App: http://localhost:3000"
echo "📊 App Metrics: http://localhost:3000/metrics"
echo "🔍 Prometheus: http://localhost:9090"
echo "📈 Grafana: http://localhost:3001 (admin/admin123)"