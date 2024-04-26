const WebSocket = require('ws');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    try {
      const data = JSON.parse(message);
      generateText(data.body);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
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



async function generateText(promptText) {
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: promptText }],
      model: 'gpt-3.5-turbo',
    });

    const text = response.choices[0].message.content
    const message = {
      type: 'TextMessage',
      body: text,
      from: 'AI'
    };
    broadcastMessage(JSON.stringify(message))
    console.log(text);
  } catch (error) {
    console.error(error);
  }
}