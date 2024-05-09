import WebSocket, { WebSocketServer } from 'ws';
import { generateText } from './openai.js';


const port = process.env.PORT || 8080;
const wss = new WebSocketServer({ port });
const clients = new Map();


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
    from: "AI"
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
    console.log('Client disconnected');
    console.error('Error:', err);
  });
});


console.log(`WebSocket server started on ws://localhost:${port}`);
