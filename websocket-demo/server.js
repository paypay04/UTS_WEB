const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8080 });

console.log("WebSocket server berjalan di ws://localhost:8080");

const clients = new Map();
let nextUserId = 1;

server.on('connection', (socket) => {
    const userId = nextUserId++;
    clients.set(socket, { id: userId, name: `User${userId}` });
    
    console.log(`Client ${userId} terhubung`);
    
    socket.send(JSON.stringify({
        type: 'init',
        userId: userId
    }));
    
    broadcastToOthers(socket, JSON.stringify({
        type: 'system',
        message: `User${userId} bergabung ke chat`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    
    socket.on('message', (data) => {
        const messageStr = data.toString();
        let parsed;
        
        try {
            parsed = JSON.parse(messageStr);
        } catch (e) {
            const clientInfo = clients.get(socket);
            broadcastToAll(JSON.stringify({
                type: 'chat',
                senderId: clientInfo.id,
                senderName: clientInfo.name,
                message: messageStr,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            return;
        }
        
        if (parsed.type === 'setName') {
            const clientInfo = clients.get(socket);
            clientInfo.name = parsed.name;
            clients.set(socket, clientInfo);
        }
        else if (parsed.type === 'chat') {
            broadcastToAll(JSON.stringify({
                type: 'chat',
                senderId: parsed.senderId,
                senderName: parsed.senderName,
                message: parsed.message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
        }
    });
    
    socket.on('close', () => {
        const clientInfo = clients.get(socket);
        console.log(`Client ${clientInfo.id} (${clientInfo.name}) terputus`);
        clients.delete(socket);
        
        broadcastToAll(JSON.stringify({
            type: 'system',
            message: `${clientInfo.name} meninggalkan chat`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
    });
});

function broadcastToAll(message) {
    clients.forEach((_, client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function broadcastToOthers(sender, message) {
    clients.forEach((_, client) => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}