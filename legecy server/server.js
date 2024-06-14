import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket, { WebSocketServer } from 'ws';
import { generateText } from './openai.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;
const clients = new Map();

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });


const broadcastMessage = (message, sender = null) => {
  for (const [client, userInfo] of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      console.log(`Message sent: ${message}`);
      client.send(message);
    }
  }
};


const broadcastAIResponse = async (text) => {
  let responseText = await generateText(text);

  const messageResponse = {
    type: 'TextMessage',
    message: responseText,
    from: "AI",
    id: "0000"
  };
  broadcastMessage(JSON.stringify(messageResponse));
};


const broadcastPeopleUpdate = () => {
  const array = Array.from(clients).map(([ws, userInfo]) => ({
    username: userInfo.username,
    id: userInfo.id
  }));

  const message = {
    type: 'PeopleUpdate',
    people: array
  };

  broadcastMessage(JSON.stringify(message));
};


wss.on('connection', ws => {
  console.log('Client connected');
  clients.set(ws, { username: null, id: null });

  broadcastPeopleUpdate();


  ws.on('message', async message => {
    console.log('Message received:', message.toString('utf8'));

    try {
      const json = JSON.parse(message);

      switch (json.type) {
        case "TextMessage":
          broadcastMessage(message, ws);
          
          if (json.message.startsWith("AI ")) {
            const text = json.message.slice(3);
            broadcastAIResponse(text);
          }
          break;

        case "UpdatePerson":
          const client = clients.get(ws)
          const person = json.person;
          client.username = person.username;
          client.id = person.id;
          broadcastPeopleUpdate();
          break;

        default:
          broadcastMessage(message, ws);
          break;
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });


  ws.on('close', () => {
    console.log('Client closed');
    clients.delete(ws);
    broadcastPeopleUpdate();
  });


  ws.on('error', err => {
    console.error('Error:', err);
  });
});


server.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});