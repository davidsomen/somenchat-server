const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: port });
const clients = new Set();

// Broadcast to all clients except the sender
const broadcastMessage = (message, sender) => {
  for (let client of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      console.log('Message sent');
      client.send(message);
    }
  }
};

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  clients.add(ws);

  ws.on('message', function incoming(message) {
    console.log('Message received');//': %s', message);
    broadcastMessage(message, ws);
  });

  ws.on('close', function() {
    console.log('Client closed');
    clients.delete(ws);
  });
  
  ws.on('error', function error(err) {
    console.log('Client disconnected');
    console.error('error: ', err);
  });
});

console.log('WebSocket server started on ws://localhost:%s', port);
