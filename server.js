const repl = require('repl');
const WebSocket = require('ws');

const port = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: port });
const clients = new Set();

const broadcastMessage = (message, sender = null) => {
  for (let client of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      console.log('Message sent');
      client.send(message);
    }
  }
};

const broadcastPlayerCount = () => {
  const message = {
    type: 'PlayerCountUpdate',
    body: clients.size.toString()
  };
  broadcastMessage(JSON.stringify(message));
}

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  clients.add(ws);

  broadcastPlayerCount();

  ws.on('message', function incoming(message) {
    console.log('Message received: %s', message);
    broadcastMessage(message, ws);
  });

  ws.on('close', function() {
    console.log('Client closed');
    clients.delete(ws);

    broadcastPlayerCount();
  });
  
  ws.on('error', function error(err) {
    console.log('Client disconnected');
    console.error('error: ', err);
  });
});

console.log('WebSocket server started on ws://localhost:%s', port);

const replServer = repl.start({
  prompt: 'WebSocket Server > ',
  input: process.stdin,
  output: process.stdout
});

replServer.context.wss = wss;
replServer.context.clients = clients;
replServer.context.broadcastMessage = broadcastMessage;