// Enhanced Network Simulator Client
const socket = io();

// Canvas setup
const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');

// State
let networkState = {
    nodes: [],
    edges: [],
    packets: [],
    stats: { total_packets: 0, delivered_packets: 0, dropped_packets: 0, average_hops: 0 }
};

let animatingPackets = new Map();
let selectedNode = null;
let draggedNode = null;
let canvasMode = 'select'; // 'select', 'add_node', 'add_edge'
let edgeStart = null;
let logCount = 0;

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Canvas events
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('contextmenu', handleCanvasRightClick);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);

    // Button events
    document.getElementById('sendPacketBtn').addEventListener('click', sendPacket);
    document.getElementById('sendBurstBtn').addEventListener('click', sendBurst);
    document.getElementById('resetBtn').addEventListener('click', resetNetwork);
    document.getElementById('congestionToggle').addEventListener('change', toggleCongestion);
    document.getElementById('clearLogBtn').addEventListener('click', clearLog);
    document.getElementById('addNodeBtn').addEventListener('click', addNodeRandom);
    document.getElementById('removeNodeBtn').addEventListener('click', removeSelectedNode);

    // Node management events
    document.getElementById('nodeSelect').addEventListener('change', updateNodeInfo);
    document.getElementById('congestionSlider').addEventListener('input', updateCongestionSlider);
    document.getElementById('routingNodeSelect').addEventListener('change', updateRoutingTable);

    // Edge management events
    document.getElementById('addEdgeBtn').addEventListener('click', addEdge);
    document.getElementById('removeEdgeBtn').addEventListener('click', removeEdge);

    // Modal events
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
    document.getElementById('applyModalBtn').addEventListener('click', applyModalCongestion);
    document.getElementById('modalCongestionSlider').addEventListener('input', function() {
        document.getElementById('modalCongestionValue').textContent = this.value + '%';
    });

    // Socket events
    socket.on('network_state', handleNetworkState);
    socket.on('packet_created', handlePacketCreated);
    socket.on('packet_routed', handlePacketRouted);
    socket.on('congestion_update', handleCongestionUpdate);
    socket.on('stats_update', handleStatsUpdate);
    socket.on('node_added', handleNodeAdded);
    socket.on('node_removed', handleNodeRemoved);
    socket.on('edge_added', handleEdgeAdded);
    socket.on('routing_updated', handleRoutingUpdated);

    // Start animation loop
    animate();

    // Update dropdowns periodically
    setInterval(updateNodeDropdowns, 1000);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    draw();
}

// Drawing functions
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    networkState.edges.forEach(([node1, node2]) => {
        const n1 = networkState.nodes.find(n => n.node_id === node1);
        const n2 = networkState.nodes.find(n => n.node_id === node2);
        if (n1 && n2) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
        }
    });

    // Draw nodes
    networkState.nodes.forEach(node => {
        drawNode(node);
    });

    // Draw animating packets
    animatingPackets.forEach((packet, packetId) => {
        if (packet.progress < 1) {
            drawPacket(packet);
        }
    });

    // Draw selection
    if (selectedNode !== null) {
        const node = networkState.nodes.find(n => n.node_id === selectedNode);
        if (node) {
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 35, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

function drawNode(node) {
    const radius = 30;

    // Get color based on congestion
    let color;
    if (node.congestion_level < 0.3) {
        color = '#22c55e';
    } else if (node.congestion_level < 0.7) {
        color = '#f59e0b';
    } else {
        color = '#ef4444';
    }

    // Draw node circle with gradient
    const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.label, node.x, node.y - 5);

    // Draw congestion percentage
    ctx.font = '12px Arial';
    ctx.fillText(`${Math.round(node.congestion_level * 100)}%`, node.x, node.y + 10);

    // Draw congestion bar below
    const barWidth = 40;
    const barHeight = 4;
    const barX = node.x - barWidth / 2;
    const barY = node.y + radius + 8;

    // Background bar
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Filled bar
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth * node.congestion_level, barHeight);
}

function drawPacket(packet) {
    const fromNode = networkState.nodes.find(n => n.node_id === packet.from);
    const toNode = networkState.nodes.find(n => n.node_id === packet.to);

    if (!fromNode || !toNode) return;

    const x = fromNode.x + (toNode.x - fromNode.x) * packet.progress;
    const y = fromNode.y + (toNode.y - fromNode.y) * packet.progress;

    // Draw packet with custom color
    ctx.fillStyle = packet.color || '#667eea';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = packet.color || '#667eea';
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw packet ID
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(`P${packet.id}`, x, y - 18);
}

function animate() {
    let needsRedraw = false;

    // Update packet animations
    animatingPackets.forEach((packet, packetId) => {
        if (packet.progress < 1) {
            packet.progress += 0.015; // Slower animation for smoother look
            needsRedraw = true;

            if (packet.progress >= 1) {
                packet.progress = 1;
            }
        }
    });

    if (needsRedraw) {
        draw();
    }

    requestAnimationFrame(animate);
}

// Canvas interaction
function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a node
    const clickedNode = findNodeAt(x, y);

    if (clickedNode !== null) {
        selectedNode = clickedNode;
        document.getElementById('nodeSelect').value = clickedNode;
        updateNodeInfo();
        openCongestionModal(clickedNode);
    } else {
        // Add new node at click position
        socket.emit('add_node', { x, y });
    }

    draw();
}

function handleCanvasRightClick(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedNode = findNodeAt(x, y);
    if (clickedNode !== null) {
        if (confirm(`Remove Node ${clickedNode}?`)) {
            socket.emit('remove_node', { node_id: clickedNode });
        }
    }
}

function handleCanvasMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    draggedNode = findNodeAt(x, y);
}

function handleCanvasMouseMove(e) {
    if (draggedNode !== null) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const node = networkState.nodes.find(n => n.node_id === draggedNode);
        if (node) {
            node.x = x;
            node.y = y;
            draw();
        }
    }
}

function handleCanvasMouseUp(e) {
    draggedNode = null;
}

function findNodeAt(x, y) {
    for (let node of networkState.nodes) {
        const dx = x - node.x;
        const dy = y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= 30) {
            return node.node_id;
        }
    }
    return null;
}

// Socket handlers
function handleNetworkState(data) {
    networkState = data;
    draw();
    updateRoutingTable();
    updateStats();
    updateNodeDropdowns();
}

function handlePacketCreated(packet) {
    addLog('created', `Packet ${packet.packet_id} created`, 
        `${packet.header.source_ip}:${packet.header.source_port} → ${packet.header.dest_ip}:${packet.header.dest_port} | Size: ${packet.size}B | TTL: ${packet.header.ttl}`);
    updateStats();
}

function handlePacketRouted(data) {
    if (data.status === 'routing') {
        // Animate packet movement
        animatingPackets.set(data.packet.packet_id, {
            id: data.packet.packet_id,
            from: data.from_node,
            to: data.to_node,
            progress: 0,
            color: data.packet.color
        });

        addLog('routing', data.message, 
            `Congestion: ${Math.round(data.congestion * 100)}% | TTL: ${data.packet.header.ttl} | Hops: ${data.hops}`);
    } else if (data.status === 'delivered') {
        animatingPackets.delete(data.packet.packet_id);
        addLog('delivered', data.message, 
            `Path: ${data.packet.path.map(n => 'N' + n).join(' → ')} | Hops: ${data.hops} | Delay: ${(data.delay * 1000).toFixed(2)}ms`);
    } else if (data.status === 'dropped') {
        animatingPackets.delete(data.packet.packet_id);
        addLog('dropped', data.message, 
            `Reason: ${data.reason || 'unknown'} | Path: ${data.packet.path.map(n => 'N' + n).join(' → ')}`);
    }
    updateStats();
}

function handleCongestionUpdate(data) {
    data.nodes.forEach(nodeUpdate => {
        const node = networkState.nodes.find(n => n.node_id === nodeUpdate.node_id);
        if (node) {
            node.congestion_level = nodeUpdate.congestion_level;
        }
    });
    draw();
}

function handleStatsUpdate(stats) {
    networkState.stats = stats;
    updateStats();
}

function handleNodeAdded(node) {
    networkState.nodes.push(node);
    draw();
    updateNodeDropdowns();
    addLog('routing', `Node ${node.node_id} added to network`, `Position: (${Math.round(node.x)}, ${Math.round(node.y)})`);
}

function handleNodeRemoved(data) {
    addLog('dropped', `Node ${data.node_id} removed from network`, 'Topology updated');
}

function handleEdgeAdded(data) {
    networkState.edges.push([data.node1, data.node2]);
    draw();
}

function handleRoutingUpdated() {
    // Refresh network state
    fetch('/api/network')
        .then(res => res.json())
        .then(data => {
            networkState = data;
            draw();
            updateRoutingTable();
        });
}

// UI functions
function sendPacket() {
    const source = parseInt(document.getElementById('sourceNode').value);
    const destination = parseInt(document.getElementById('destNode').value);
    const size = parseInt(document.getElementById('packetSize').value);

    if (source === destination) {
        alert('Source and destination must be different!');
        return;
    }

    socket.emit('send_packet', { source, destination, size });
}

function sendBurst() {
    const source = parseInt(document.getElementById('sourceNode').value);
    const destination = parseInt(document.getElementById('destNode').value);
    const size = parseInt(document.getElementById('packetSize').value);

    if (source === destination) {
        alert('Source and destination must be different!');
        return;
    }

    socket.emit('send_burst', { source, destination, size, count: 5 });
    addLog('created', 'Burst transmission initiated', '5 packets queued for transmission');
}

function resetNetwork() {
    if (confirm('Reset the entire network? This will clear all nodes and packets.')) {
        fetch('/api/reset', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                networkState = data.network;
                animatingPackets.clear();
                draw();
                updateStats();
                updateNodeDropdowns();
                clearLog();
                addLog('routing', 'Network reset to default topology', '6 nodes, 8 edges');
            });
    }
}

function toggleCongestion(e) {
    socket.emit('toggle_congestion', { enabled: e.target.checked });
    addLog('routing', 
        e.target.checked ? 'Automatic congestion enabled' : 'Automatic congestion disabled',
        e.target.checked ? 'Network will experience random traffic fluctuations' : 'Only manual congestion control active');
}

function addNodeRandom() {
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    socket.emit('add_node', { x, y });
}

function removeSelectedNode() {
    const nodeId = parseInt(document.getElementById('nodeSelect').value);
    if (confirm(`Remove Node ${nodeId}? This will also remove all connected edges.`)) {
        socket.emit('remove_node', { node_id: nodeId });
    }
}

function addEdge() {
    const node1 = parseInt(document.getElementById('edgeNode1').value);
    const node2 = parseInt(document.getElementById('edgeNode2').value);

    if (node1 === node2) {
        alert('Cannot create edge between the same node!');
        return;
    }

    // Check if edge already exists
    const edgeExists = networkState.edges.some(([n1, n2]) => 
        (n1 === node1 && n2 === node2) || (n1 === node2 && n2 === node1)
    );

    if (edgeExists) {
        alert(`Edge between Node ${node1} and Node ${node2} already exists!`);
        return;
    }

    socket.emit('add_edge', { node1, node2 });
    addLog('routing', `Edge added`, `Node ${node1} ↔ Node ${node2}`);
}

function removeEdge() {
    const node1 = parseInt(document.getElementById('edgeNode1').value);
    const node2 = parseInt(document.getElementById('edgeNode2').value);

    // Check if edge exists
    const edgeExists = networkState.edges.some(([n1, n2]) => 
        (n1 === node1 && n2 === node2) || (n1 === node2 && n2 === node1)
    );

    if (!edgeExists) {
        alert(`No edge exists between Node ${node1} and Node ${node2}!`);
        return;
    }

    socket.emit('remove_edge', { node1, node2 });
    addLog('routing', `Edge removed`, `Node ${node1} ↔ Node ${node2}`);
}

function updateNodeInfo() {
    const nodeId = parseInt(document.getElementById('nodeSelect').value);
    const node = networkState.nodes.find(n => n.node_id === nodeId);

    if (node) {
        document.getElementById('congestionSlider').value = Math.round(node.manual_congestion * 100);
        document.getElementById('congestionValue').textContent = Math.round(node.manual_congestion * 100) + '%';
        document.getElementById('nodeProcessed').textContent = node.packets_processed || 0;
        document.getElementById('nodeDropped').textContent = node.packets_dropped || 0;
    }
}

function updateCongestionSlider() {
    const nodeId = parseInt(document.getElementById('nodeSelect').value);
    const congestion = parseInt(document.getElementById('congestionSlider').value) / 100;

    document.getElementById('congestionValue').textContent = Math.round(congestion * 100) + '%';
    socket.emit('set_node_congestion', { node_id: nodeId, congestion });
}

function updateRoutingTable() {
    const nodeId = parseInt(document.getElementById('routingNodeSelect').value);
    const node = networkState.nodes.find(n => n.node_id === nodeId);

    if (!node || !node.routing_table) return;

    const content = document.getElementById('routingTableContent');
    let html = '<div class="routing-row"><div>Destination</div><div>Next Hop</div><div>Cost</div><div>Status</div></div>';

    Object.entries(node.routing_table).forEach(([dest, [nextHop, cost]]) => {
        const destNode = networkState.nodes.find(n => n.node_id === parseInt(dest));
        let status = '🟢 Low';
        if (destNode) {
            if (destNode.congestion_level >= 0.7) status = '🔴 High';
            else if (destNode.congestion_level >= 0.3) status = '🟡 Medium';
        }

        html += `<div class="routing-row">
            <div>Node ${dest}</div>
            <div>Node ${nextHop}</div>
            <div>${cost}</div>
            <div>${status}</div>
        </div>`;
    });

    content.innerHTML = html;
}

function updateStats() {
    document.getElementById('totalPackets').textContent = networkState.stats.total_packets;
    document.getElementById('deliveredPackets').textContent = networkState.stats.delivered_packets;
    document.getElementById('droppedPackets').textContent = networkState.stats.dropped_packets;

    const rate = networkState.stats.total_packets > 0 
        ? (networkState.stats.delivered_packets / networkState.stats.total_packets * 100).toFixed(1)
        : 0;
    document.getElementById('deliveryRate').textContent = rate + '%';

    document.getElementById('avgHops').textContent = (networkState.stats.average_hops || 0).toFixed(1);
    document.getElementById('activePackets').textContent = animatingPackets.size;
}

function updateNodeDropdowns() {
    const nodes = networkState.nodes.map(n => n.node_id).sort((a, b) => a - b);

    ['sourceNode', 'destNode', 'nodeSelect', 'routingNodeSelect', 'edgeNode1', 'edgeNode2'].forEach(id => {
        const select = document.getElementById(id);
        const currentValue = select.value;
        select.innerHTML = '';

        nodes.forEach(nodeId => {
            const option = document.createElement('option');
            option.value = nodeId;
            option.textContent = `Node ${nodeId}`;
            select.appendChild(option);
        });

        if (nodes.includes(parseInt(currentValue))) {
            select.value = currentValue;
        }
    });
}

function addLog(type, message, details) {
    const log = document.getElementById('packetLog');
    const time = new Date().toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <div class="log-time">[${time}]</div>
        <div class="log-message">${message}</div>
        ${details ? `<div class="log-details">${details}</div>` : ''}
    `;

    log.insertBefore(entry, log.firstChild);

    logCount++;
    document.getElementById('logCounter').textContent = `${logCount} events`;

    // Keep only last 100 entries
    while (log.children.length > 100) {
        log.removeChild(log.lastChild);
    }
}

function clearLog() {
    document.getElementById('packetLog').innerHTML = '';
    logCount = 0;
    document.getElementById('logCounter').textContent = '0 events';
}

// Modal functions
function openCongestionModal(nodeId) {
    const node = networkState.nodes.find(n => n.node_id === nodeId);
    if (!node) return;

    document.getElementById('modalNodeId').textContent = nodeId;
    document.getElementById('modalCongestionSlider').value = Math.round(node.manual_congestion * 100);
    document.getElementById('modalCongestionValue').textContent = Math.round(node.manual_congestion * 100) + '%';
    document.getElementById('congestionModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('congestionModal').style.display = 'none';
}

function applyModalCongestion() {
    const nodeId = parseInt(document.getElementById('modalNodeId').textContent);
    const congestion = parseInt(document.getElementById('modalCongestionSlider').value) / 100;

    socket.emit('set_node_congestion', { node_id: nodeId, congestion });
    closeModal();
    addLog('routing', `Node ${nodeId} congestion set to ${Math.round(congestion * 100)}%`, 'Manual congestion control applied');
}

// Utility functions
function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

// Initialize on load
window.addEventListener('load', init);

// Close modal on outside click
window.addEventListener('click', function(event) {
    const modal = document.getElementById('congestionModal');
    if (event.target === modal) {
        closeModal();
    }
});
