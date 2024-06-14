import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateText = async (promptText) => {
  try {
    const response = await openai.chat.completions.create({
      messages: [{ role: 'user', content: promptText }],
      model: 'gpt-4o',
    });

    const text = response.choices[0].message.content;

    console.log(text);

    return text
  } catch (error) {
    console.error(error);
  }
}

export { generateText };