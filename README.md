# Enhanced Computer Network Simulator - BTech Project

## 🚀 NEW FEATURES IN THIS VERSION

### ✨ Major Enhancements

1. **User-Controlled Congestion**
   - Adjust congestion level for each node using slider (0-100%)
   - Click on any node to open congestion control modal
   - Real-time visual feedback with color coding
   - Manual + automatic congestion combination

2. **Dynamic Node Management**
   - ➕ Add nodes by clicking anywhere on canvas
   - ➖ Remove nodes with right-click
   - 🖱️ Drag and drop nodes to reposition
   - Automatic routing table updates
   - Visual node selection

3. **Multiple Simultaneous Packets**
   - Send single packets or packet bursts (5 at once)
   - Each packet has unique color for easy tracking
   - Multiple packets animate smoothly through network
   - Real-time active packet counter

4. **Enhanced Analytics**
   - Per-node statistics (packets processed/dropped)
   - Average hops metric
   - Active packet tracking
   - Event counter in log
   - Detailed packet headers with timestamps

5. **Improved UI/UX**
   - Gradient backgrounds and modern design
   - Smooth packet animations with glow effects
   - Interactive modals for node control
   - Congestion progress bars under nodes
   - Hover effects and transitions

## 📦 What's Included

```
network_simulator_enhanced/
├── app.py                    # Enhanced Flask backend
├── requirements.txt          # Python dependencies
├── README.md                # This file
├── templates/
│   └── index.html           # Enhanced UI with new features
└── static/
    ├── style.css            # Modern styling with animations
    └── script.js            # Advanced client-side logic
```

## 🎯 Key Features

### Network Management
- ✅ Add/remove nodes dynamically
- ✅ Drag and reposition nodes
- ✅ Add/remove edges between nodes
- ✅ Automatic routing table computation
- ✅ Visual topology updates

### Congestion Control
- ✅ Per-node manual congestion (0-100%)
- ✅ Automatic random congestion toggle
- ✅ Real-time congestion visualization
- ✅ Color-coded indicators (green/orange/red)
- ✅ Congestion affects packet speed

### Packet Management
- ✅ Single packet transmission
- ✅ Burst transmission (5 packets)
- ✅ Multiple simultaneous packets
- ✅ Unique colors per packet
- ✅ Complete TCP/IP headers
- ✅ TTL tracking and expiration
- ✅ Path tracking with hop count

### Analytics & Monitoring
- ✅ Total/delivered/dropped packet counts
- ✅ Delivery rate percentage
- ✅ Average hops per packet
- ✅ Active packet counter
- ✅ Per-node statistics
- ✅ Real-time event log (100 events max)
- ✅ Routing table visualization

## 🚀 Installation & Usage

### Step 1: Extract and Navigate
```bash
unzip network_simulator_enhanced.zip
cd network_simulator_enhanced
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

Or install manually:
```bash
pip install Flask flask-socketio python-socketio eventlet
```

### Step 3: Run Server
```bash
python app.py
```

### Step 4: Open Browser
Navigate to: **http://localhost:5000**

## 🎮 How to Use

### Adding/Removing Nodes
1. **Add Node**: Click anywhere on empty canvas space
2. **Remove Node**: Right-click on node → confirm
3. **Move Node**: Click and drag node to new position
4. **Adjust Congestion**: Click node → set slider → apply

### Sending Packets
1. Select source and destination from dropdowns
2. Choose packet size (64B to 1500B)
3. Click "Send Single Packet" for one packet
4. Click "Send Burst" for 5 packets at once
5. Watch packets animate through network!

### Controlling Congestion
**Method 1: Manual Control Panel**
- Select node from dropdown
- Adjust slider (0-100%)
- Changes apply immediately

**Method 2: Click on Node**
- Click any node on canvas
- Modal opens with congestion control
- Adjust slider and click "Apply"

**Method 3: Automatic**
- Toggle "Auto Congestion" switch
- Network experiences random traffic

### Viewing Statistics
- **Network Stats**: Top-right panel shows overall metrics
- **Node Stats**: Select node to see its individual statistics
- **Routing Table**: Choose node to view its routing decisions
- **Packet Log**: Bottom panel shows all events with details

## 🎨 Visual Features

### Node Colors
- 🟢 **Green**: Low congestion (0-30%)
- 🟡 **Orange**: Medium congestion (30-70%)
- 🔴 **Red**: High congestion (70-100%)

### Packet Colors
Each packet gets a random color from:
- Purple (#667eea)
- Orange (#f59e0b)
- Green (#10b981)
- Red (#ef4444)
- Purple (#8b5cf6)
- Pink (#ec4899)
- Cyan (#06b6d4)

### Animations
- Smooth packet movement between nodes
- Glow effects around active packets
- Fade-in effects for log entries
- Hover animations on buttons and panels
- Progress bars for node congestion

## 📊 Statistics Explained

### Network-Level
- **Total Packets**: All packets sent
- **Delivered**: Successfully reached destination
- **Dropped**: Failed due to congestion/TTL/no route
- **Delivery Rate**: (Delivered / Total) × 100%
- **Avg Hops**: Average number of hops per delivered packet
- **Active Packets**: Currently in transit

### Node-Level (per node)
- **Packets Processed**: Total packets that passed through
- **Packets Dropped**: Packets dropped at this node
- **Congestion Level**: Current congestion (0-100%)
- **Manual Congestion**: User-set congestion level

## 🔧 Advanced Usage

### Creating Custom Topologies
1. Click "Reset" to start fresh
2. Add nodes by clicking on canvas
3. Nodes auto-connect to nearest neighbors
4. Right-click to remove unwanted nodes
5. Drag nodes to organize layout

### Testing Congestion
1. Set high congestion (80-100%) on middle nodes
2. Send burst packets
3. Observe packet dropping and slow transmission
4. Check node statistics to see drop counts

### Monitoring Network Performance
1. Send multiple bursts
2. Toggle auto congestion on/off
3. Compare delivery rates
4. Check average hops for different paths
5. View routing table changes

## 🎓 Perfect for BTech Projects

### Demonstrates
1. **Routing Algorithms** - Dijkstra's shortest path
2. **Congestion Control** - Queue management, RED concepts
3. **Packet Switching** - Hop-by-hop forwarding
4. **Network Topology** - Dynamic graph management
5. **Real-time Systems** - WebSocket communication
6. **Full-Stack Development** - Python + JavaScript
7. **UI/UX Design** - Modern responsive interface
8. **Data Visualization** - Canvas rendering, animations

### Report Sections
- Introduction to computer networks
- Routing algorithm implementation
- Congestion control mechanisms
- Packet structure and headers
- Performance analysis
- User interface design
- Testing and results
- Future enhancements

## 🐛 Troubleshooting

### Port Already in Use
Edit `app.py` line at bottom:
```python
socketio.run(app, host='0.0.0.0', port=5001, debug=True)
```

### Packets Not Moving
- Refresh browser (Ctrl+F5)
- Check browser console for errors
- Ensure WebSocket connection active

### Nodes Not Adding
- Try clicking on empty space (not on existing nodes)
- Check if maximum node limit reached
- Refresh page if canvas not responding

### High CPU Usage
- Reduce number of active packets
- Disable auto congestion
- Close other browser tabs

## 🚀 Future Enhancements

Possible additions for advanced projects:
- Different routing protocols (RIP, OSPF, BGP)
- QoS (Quality of Service) priority queues
- Network attacks simulation (DDoS, flooding)
- Multiple protocol support (TCP, UDP, ICMP)
- Packet fragmentation and reassembly
- Error detection/correction codes
- Save/load network topologies
- Export statistics to CSV
- 3D network visualization
- Mobile app version

## 📚 Technologies Used

### Backend
- **Python 3.7+**: Core language
- **Flask**: Web framework
- **Flask-SocketIO**: Real-time bidirectional communication
- **Eventlet**: Async server

### Frontend
- **HTML5 Canvas**: Network visualization
- **CSS3**: Modern styling with gradients and animations
- **JavaScript ES6+**: Client-side logic
- **Socket.IO**: WebSocket client

### Algorithms
- **Dijkstra's Algorithm**: Shortest path routing
- **Priority Queue (Heap)**: Efficient path computation
- **Graph Theory**: Network topology management

## 📖 Learning Resources

- **Computer Networks**: Tanenbaum & Wetherall
- **Routing Algorithms**: Cormen's "Introduction to Algorithms"
- **TCP/IP**: RFC 791, RFC 793
- **Congestion Control**: RFC 5681, RFC 2914
- **Flask**: https://flask.palletsprojects.com/
- **Socket.IO**: https://socket.io/docs/

## 🎉 Quick Start Commands

```bash
# Extract
unzip network_simulator_enhanced.zip

# Navigate
cd network_simulator_enhanced

# Install
pip install -r requirements.txt

# Run
python app.py

# Open browser to http://localhost:5000
```

## ✨ Tips for Impressive Demo

1. **Start with default topology**
2. **Add 2-3 nodes** by clicking canvas
3. **Set high congestion** (80%) on middle nodes
4. **Send burst packets** to show multiple simultaneous transmissions
5. **Toggle auto congestion** to show dynamic behavior
6. **Point out**:
   - Color-coded congestion levels
   - Multiple packets with different colors
   - Real-time statistics updates
   - Routing table computation
   - Packet dropping due to congestion
   - Per-node analytics

## 📄 License

Educational project for BTech students. Free to use and modify for academic purposes.

---

**Created for BTech Computer Networks Course**  
**Version 2.0 - Enhanced Edition**  

Enjoy your enhanced network simulation! 🌐✨
