#!/usr/bin/env python3
"""
Computer Network Simulator - Enhanced Full Stack Application
Features: User-controlled congestion, dynamic node management, multiple packets
"""

import sys
import io
# Force UTF-8 encoding for console output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit
import random
import time
import heapq
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import threading

app = Flask(__name__)
app.config['SECRET_KEY'] = 'network-simulator-enhanced-key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')


@dataclass
class PacketHeader:
    """TCP/IP Packet Header Structure"""
    version: str = "IPv4"
    protocol: str = "TCP"
    source_ip: str = ""
    dest_ip: str = ""
    source_port: int = 0
    dest_port: int = 80
    sequence_number: int = 0
    ttl: int = 20
    flags: str = "ACK"
    checksum: str = ""
    timestamp: float = 0.0

    def to_dict(self):
        return asdict(self)


@dataclass
class Packet:
    """Network Packet with header and routing information"""
    packet_id: int
    source: int
    destination: int
    size: int
    color: str = "#667eea"
    current_node: int = 0
    path: List[int] = field(default_factory=list)
    status: str = "in_transit"
    header: Optional[Dict] = None
    hops: int = 0
    start_time: float = 0.0

    def __post_init__(self):
        if self.current_node == 0:
            self.current_node = self.source
        if not self.path:
            self.path = [self.source]

        if self.start_time == 0.0:
            self.start_time = time.time()

        if not self.header:
            header = PacketHeader(
                source_ip=f"192.168.1.{self.source}",
                dest_ip=f"192.168.1.{self.destination}",
                source_port=random.randint(10000, 60000),
                sequence_number=random.randint(1, 1000000),
                checksum=f"0x{random.randint(0, 0xFFFF):04X}",
                timestamp=self.start_time
            )
            self.header = header.to_dict()

    def to_dict(self):
        return {
            'packet_id': self.packet_id,
            'source': self.source,
            'destination': self.destination,
            'size': self.size,
            'color': self.color,
            'current_node': self.current_node,
            'path': self.path,
            'status': self.status,
            'header': self.header,
            'hops': self.hops
        }


class Node:
    """Network Node with routing table and congestion control"""

    def __init__(self, node_id: int, x: float, y: float):
        self.node_id = node_id
        self.label = f"N{node_id}"
        self.x = x
        self.y = y
        self.congestion_level = 0.0
        self.manual_congestion = 0.0  # User-controlled congestion
        self.routing_table: Dict[int, Tuple[int, int]] = {}
        self.packet_queue: List[Packet] = []
        self.packets_processed = 0
        self.packets_dropped = 0

    def update_congestion(self, random_traffic: bool = False):
        """Update congestion level based on queue, manual, and random traffic"""
        queue_congestion = min(len(self.packet_queue) * 0.15, 0.4)

        # Combine manual and automatic congestion
        base_congestion = min(self.manual_congestion + queue_congestion, 1.0)

        if random_traffic:
            random_factor = random.uniform(-0.15, 0.25)
            self.congestion_level = max(0.0, min(1.0, base_congestion + random_factor))
        else:
            self.congestion_level = base_congestion

    def get_transmission_delay(self, packet_size: int) -> float:
        """Calculate transmission delay based on congestion"""
        base_delay = packet_size / 1000000
        congestion_factor = 1 + (self.congestion_level * 4)  # Up to 5x slower
        return base_delay * congestion_factor

    def should_drop_packet(self) -> bool:
        """Probabilistic packet dropping based on congestion"""
        drop_probability = self.congestion_level * 0.35
        return random.random() < drop_probability

    def to_dict(self):
        return {
            'node_id': self.node_id,
            'label': self.label,
            'x': self.x,
            'y': self.y,
            'congestion_level': self.congestion_level,
            'manual_congestion': self.manual_congestion,
            'packets_processed': self.packets_processed,
            'packets_dropped': self.packets_dropped,
            'routing_table': {str(k): v for k, v in self.routing_table.items()}
        }


class Network:
    """Network topology with nodes and edges"""

    def __init__(self):
        self.nodes: Dict[int, Node] = {}
        self.edges: List[Tuple[int, int]] = []
        self.packets: List[Packet] = []
        self.packet_id_counter = 0
        self.node_id_counter = 0
        self.random_congestion = False
        self.active_packets = []  # Currently routing packets

        self.stats = {
            'total_packets': 0,
            'delivered_packets': 0,
            'dropped_packets': 0,
            'total_delay': 0.0,
            'average_hops': 0.0
        }

    def add_node(self, node_id: int, x: float, y: float) -> Node:
        """Add a node to the network"""
        if node_id not in self.nodes:
            self.nodes[node_id] = Node(node_id, x, y)
            if node_id >= self.node_id_counter:
                self.node_id_counter = node_id + 1
        return self.nodes[node_id]

    def remove_node(self, node_id: int) -> bool:
        """Remove a node from the network"""
        if node_id not in self.nodes:
            return False

        # Remove edges connected to this node
        self.edges = [(n1, n2) for n1, n2 in self.edges 
                      if n1 != node_id and n2 != node_id]

        # Remove the node
        del self.nodes[node_id]

        # Recompute routing tables
        self.compute_routing_tables()

        return True

    def add_edge(self, node1: int, node2: int):
        """Add bidirectional edge between nodes"""
        if node1 in self.nodes and node2 in self.nodes:
            if (node1, node2) not in self.edges and (node2, node1) not in self.edges:
                self.edges.append((node1, node2))

    def remove_edge(self, node1: int, node2: int):
        """Remove edge between nodes"""
        if (node1, node2) in self.edges:
            self.edges.remove((node1, node2))
        elif (node2, node1) in self.edges:
            self.edges.remove((node2, node1))

    def set_node_congestion(self, node_id: int, congestion: float):
        """Set manual congestion level for a node"""
        if node_id in self.nodes:
            self.nodes[node_id].manual_congestion = max(0.0, min(1.0, congestion))

    def compute_routing_tables(self):
        """Compute routing tables for all nodes using Dijkstra's algorithm"""
        for source_id in self.nodes:
            self.nodes[source_id].routing_table = self._dijkstra(source_id)

    def _dijkstra(self, source_id: int) -> Dict[int, Tuple[int, int]]:
        """Dijkstra's shortest path algorithm"""
        distances = {node_id: float('inf') for node_id in self.nodes}
        distances[source_id] = 0
        previous = {node_id: None for node_id in self.nodes}

        pq = [(0, source_id)]
        visited = set()

        while pq:
            current_dist, current = heapq.heappop(pq)

            if current in visited:
                continue
            visited.add(current)

            for edge in self.edges:
                if edge[0] == current:
                    neighbor = edge[1]
                elif edge[1] == current:
                    neighbor = edge[0]
                else:
                    continue

                if neighbor in visited:
                    continue

                new_dist = current_dist + 1

                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))

        routing_table = {}
        for dest_id in self.nodes:
            if dest_id == source_id:
                continue

            path = []
            current = dest_id
            while current is not None:
                path.append(current)
                current = previous[current]
            path.reverse()

            if len(path) > 1:
                next_hop = path[1]
                routing_table[dest_id] = (next_hop, distances[dest_id])

        return routing_table

    def _dijkstra_weighted(self, source_id: int, congestion_weight: float = 8.0) -> Dict[int, Tuple[int, float]]:
        """Dijkstra that factors node congestion into path cost.

        The cost to traverse to a neighbor is 1 + congestion_weight * neighbor.congestion_level.
        Returns a routing table mapping destination -> (next_hop, total_cost).
        """
        # Initialize distances using float cost
        distances = {node_id: float('inf') for node_id in self.nodes}
        distances[source_id] = 0.0
        previous = {node_id: None for node_id in self.nodes}

        pq = [(0.0, source_id)]
        visited = set()

        while pq:
            current_dist, current = heapq.heappop(pq)

            if current in visited:
                continue
            visited.add(current)

            for edge in self.edges:
                if edge[0] == current:
                    neighbor = edge[1]
                elif edge[1] == current:
                    neighbor = edge[0]
                else:
                    continue

                if neighbor in visited:
                    continue

                # cost increases with neighbor congestion
                neighbor_node = self.nodes[neighbor]
                step_cost = 1.0 + (congestion_weight * neighbor_node.congestion_level)
                new_dist = current_dist + step_cost

                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))

        routing_table = {}
        for dest_id in self.nodes:
            if dest_id == source_id:
                continue

            path = []
            current = dest_id
            while current is not None:
                path.append(current)
                current = previous[current]
            path.reverse()

            if len(path) > 1:
                next_hop = path[1]
                routing_table[dest_id] = (next_hop, distances[dest_id])

        return routing_table

    def find_congestion_aware_next_hop(self, source: int, destination: int, congestion_weight: float = 8.0) -> Optional[int]:
        """Return next hop from source to destination factoring current congestion.

        Returns None if no route found.
        """
        if source not in self.nodes or destination not in self.nodes:
            return None

        weighted_table = self._dijkstra_weighted(source, congestion_weight=congestion_weight)
        entry = weighted_table.get(destination)
        if not entry:
            return None
        return entry[0]

    def create_packet(self, source: int, destination: int, size: int = 512) -> Optional[Packet]:
        """Create a new packet"""
        if source not in self.nodes or destination not in self.nodes:
            return None

        if source == destination:
            return None

        # Generate random color for this packet
        colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

        packet = Packet(
            packet_id=self.packet_id_counter,
            source=source,
            destination=destination,
            size=size,
            color=random.choice(colors)
        )
        self.packet_id_counter += 1
        self.packets.append(packet)
        self.stats['total_packets'] += 1

        # Enqueue packet at source node to simulate arrival into node queue
        if source in self.nodes:
            self.nodes[source].packet_queue.append(packet)

        return packet

    def route_packet_step(self, packet: Packet) -> Dict:
        """Route packet one step, return status"""
        current_node = self.nodes[packet.current_node]

        # Ensure packet is registered in the node's queue
        if packet not in current_node.packet_queue:
            current_node.packet_queue.append(packet)

        # Increment processed counter when we actively handle it
        current_node.packets_processed += 1

        # Check if delivered
        if packet.current_node == packet.destination:
            packet.status = "delivered"
            self.stats['delivered_packets'] += 1
            delay = time.time() - packet.start_time
            self.stats['total_delay'] += delay

            # Update average hops
            total_hops = self.stats.get('total_hops', 0) + packet.hops
            self.stats['total_hops'] = total_hops
            self.stats['average_hops'] = total_hops / self.stats['delivered_packets']

            return {
                'status': 'delivered',
                'packet': packet.to_dict(),
                'message': f'Packet {packet.packet_id} delivered successfully!',
                'delay': delay,
                'hops': packet.hops
            }

        # Check TTL
        if packet.header['ttl'] <= 0:
            packet.status = "dropped"
            self.stats['dropped_packets'] += 1
            current_node.packets_dropped += 1
            return {
                'status': 'dropped',
                'packet': packet.to_dict(),
                'message': f'Packet {packet.packet_id} dropped: TTL expired',
                'reason': 'ttl_expired'
            }

        # Check for route
        if packet.destination not in current_node.routing_table:
            packet.status = "dropped"
            self.stats['dropped_packets'] += 1
            current_node.packets_dropped += 1
            return {
                'status': 'dropped',
                'packet': packet.to_dict(),
                'message': f'Packet {packet.packet_id} dropped: No route',
                'reason': 'no_route'
            }

        # Check congestion-based dropping
        if current_node.should_drop_packet():
            packet.status = "dropped"
            self.stats['dropped_packets'] += 1
            current_node.packets_dropped += 1
            # Remove from queue if present
            if packet in current_node.packet_queue:
                try:
                    current_node.packet_queue.remove(packet)
                except ValueError:
                    pass
            return {
                'status': 'dropped',
                'packet': packet.to_dict(),
                'message': f'Packet {packet.packet_id} dropped: Congestion at Node {current_node.node_id}',
                'reason': 'congestion',
                'congestion_level': current_node.congestion_level
            }

        # Route to next hop (congestion-aware with probabilistic reroute at medium congestion)
        next_hop, _ = current_node.routing_table[packet.destination]

        next_hop_node = self.nodes.get(next_hop)
        medium_threshold = 0.4
        congestion_threshold = 0.85

        rerouted = False
        chosen_next = next_hop

        # If next hop is present and has at least medium congestion, some packets may be rerouted
        if next_hop_node:
            c = next_hop_node.congestion_level
            if c >= medium_threshold:
                # Probability to reroute increases with congestion (linear scaling)
                p = min(1.0, (c - medium_threshold) / (1.0 - medium_threshold))

                # Make reroute decision more conservative when only medium congestion
                # If congestion is very high, force reroute unless no alternative
                force_reroute = c >= congestion_threshold

                if force_reroute or random.random() < p:
                    alt = self.find_congestion_aware_next_hop(current_node.node_id, packet.destination)
                    if alt is not None and alt != next_hop:
                        chosen_next = alt
                        rerouted = True

        delay = current_node.get_transmission_delay(packet.size)

        # Move packet: remove from current queue, append to next node queue
        if packet in current_node.packet_queue:
            try:
                current_node.packet_queue.remove(packet)
            except ValueError:
                pass

        packet.current_node = chosen_next
        packet.path.append(chosen_next)
        packet.header['ttl'] -= 1
        packet.hops += 1

        # Enqueue at next hop to reflect load
        next_node_obj = self.nodes.get(chosen_next)
        if next_node_obj is not None:
            next_node_obj.packet_queue.append(packet)

        message = f'Packet {packet.packet_id} routed: N{current_node.node_id} → N{chosen_next}'
        if rerouted:
            message += ' (rerouted due to congestion)'

        return {
            'status': 'routing',
            'packet': packet.to_dict(),
            'message': message,
            'from_node': current_node.node_id,
            'to_node': chosen_next,
            'congestion': current_node.congestion_level,
            'delay': delay,
            'hops': packet.hops
        }

    def update_congestion_all(self):
        """Update congestion for all nodes"""
        for node in self.nodes.values():
            node.update_congestion(self.random_congestion)

    def to_dict(self):
        return {
            'nodes': [node.to_dict() for node in self.nodes.values()],
            'edges': [[e[0], e[1]] for e in self.edges],
            'packets': [p.to_dict() for p in self.packets if p.status == 'in_transit'],
            'stats': self.stats
        }


# Global network instance
network = Network()


def initialize_network():
    """Initialize default network topology"""
    global network
    network = Network()

    # Create 6 nodes in a visually pleasing layout
    positions = [
        (150, 200),   # Node 0
        (400, 100),   # Node 1
        (400, 300),   # Node 2
        (650, 100),   # Node 3
        (650, 300),   # Node 4
        (900, 200),   # Node 5
    ]

    for i, (x, y) in enumerate(positions):
        network.add_node(i, x, y)

    # Add edges
    network.add_edge(0, 1)
    network.add_edge(0, 2)
    network.add_edge(1, 3)
    network.add_edge(2, 4)
    network.add_edge(3, 5)
    network.add_edge(4, 5)
    network.add_edge(1, 2)
    network.add_edge(3, 4)

    network.compute_routing_tables()


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')


@app.route('/api/network')
def get_network():
    """Get current network state"""
    return jsonify(network.to_dict())


@app.route('/api/reset', methods=['POST'])
def reset_network():
    """Reset the network"""
    initialize_network()
    return jsonify({'status': 'success', 'network': network.to_dict()})


@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    emit('network_state', network.to_dict())


@socketio.on('send_packet')
def handle_send_packet(data):
    """Handle packet sending request"""
    source = data.get('source')
    destination = data.get('destination')
    size = data.get('size', 512)

    packet = network.create_packet(source, destination, size)

    if packet:
        emit('packet_created', packet.to_dict(), broadcast=True)
        network.active_packets.append(packet)
        # Start routing in background
        socketio.start_background_task(route_packet_background, packet)
    else:
        emit('error', {'message': 'Invalid packet parameters'})


@socketio.on('send_burst')
def handle_send_burst(data):
    """Handle burst packet sending (multiple packets at once)"""
    source = data.get('source')
    destination = data.get('destination')
    count = data.get('count', 5)
    size = data.get('size', 512)

    packets = []
    for i in range(count):
        packet = network.create_packet(source, destination, size)
        if packet:
            packets.append(packet)
            network.active_packets.append(packet)
            emit('packet_created', packet.to_dict(), broadcast=True)
            # Start routing with slight delay
            socketio.start_background_task(route_packet_background, packet, delay=i*0.2)

    emit('burst_sent', {'count': len(packets)}, broadcast=True)


@socketio.on('toggle_congestion')
def handle_toggle_congestion(data):
    """Toggle random congestion"""
    network.random_congestion = data.get('enabled', False)
    emit('congestion_toggled', {'enabled': network.random_congestion}, broadcast=True)


@socketio.on('set_node_congestion')
def handle_set_node_congestion(data):
    """Set manual congestion for a node"""
    node_id = data.get('node_id')
    congestion = data.get('congestion', 0.0)
    network.set_node_congestion(node_id, congestion)
    emit('node_congestion_updated', {
        'node_id': node_id,
        'congestion': congestion
    }, broadcast=True)


@socketio.on('add_node')
def handle_add_node(data):
    """Add a new node to the network"""
    x = data.get('x', 500)
    y = data.get('y', 250)

    node_id = network.node_id_counter
    network.add_node(node_id, x, y)
    network.compute_routing_tables()

    emit('node_added', network.nodes[node_id].to_dict(), broadcast=True)
    emit('routing_updated', broadcast=True)


@socketio.on('remove_node')
def handle_remove_node(data):
    """Remove a node from the network"""
    node_id = data.get('node_id')

    if network.remove_node(node_id):
        emit('node_removed', {'node_id': node_id}, broadcast=True)
        emit('network_state', network.to_dict(), broadcast=True)
    else:
        emit('error', {'message': f'Cannot remove node {node_id}'})


@socketio.on('add_edge')
def handle_add_edge(data):
    """Add an edge between two nodes"""
    node1 = data.get('node1')
    node2 = data.get('node2')

    network.add_edge(node1, node2)
    network.compute_routing_tables()

    emit('edge_added', {'node1': node1, 'node2': node2}, broadcast=True)
    emit('routing_updated', broadcast=True)


@socketio.on('remove_edge')
def handle_remove_edge(data):
    """Remove an edge between two nodes"""
    node1 = data.get('node1')
    node2 = data.get('node2')

    network.remove_edge(node1, node2)
    network.compute_routing_tables()

    emit('edge_removed', {'node1': node1, 'node2': node2}, broadcast=True)
    emit('routing_updated', broadcast=True)


def route_packet_background(packet, delay=0):
    """Background task to route packet through network"""
    if delay > 0:
        time.sleep(delay)

    with app.app_context():
        while packet.status == 'in_transit':
            # Update congestion
            network.update_congestion_all()

            # Emit congestion update
            socketio.emit('congestion_update', {
                'nodes': [{
                    'node_id': n.node_id,
                    'congestion_level': n.congestion_level
                } for n in network.nodes.values()]
            })

            # Route packet one step
            result = network.route_packet_step(packet)

            # Emit routing event
            socketio.emit('packet_routed', result)

            # Variable delay based on congestion
            step_delay = 0.6 + (result.get('delay', 0) * 100)
            time.sleep(step_delay)

            if packet.status != 'in_transit':
                if packet in network.active_packets:
                    network.active_packets.remove(packet)
                break

        # Emit final statistics
        socketio.emit('stats_update', network.stats)


if __name__ == '__main__':
    initialize_network()
    print("\n" + "="*60)
    print("🌐 Enhanced Network Simulator Server Starting...")
    print("="*60)
    print("📡 Server: http://localhost:5000")
    print("✨ Features:")
    print("   - User-controlled congestion")
    print("   - Dynamic node/edge management")
    print("   - Multiple simultaneous packets")
    print("   - Advanced packet analytics")
    print("🎯 Open your browser and navigate to the URL above")
    print("="*60 + "\n")
    # Use the threading async mode for the development server to avoid
    # compatibility issues with different eventlet versions.
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)
