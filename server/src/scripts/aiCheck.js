import { analyzeComplaintText } from '../services/geminiService.js';

const sample = {
  title: 'Sparks from socket',
  description: 'The socket next to my bed is sparking and smells burnt. Please come quickly.',
};

try {
  const result = await analyzeComplaintText(sample);
  console.log('AI result:', result);
} catch (err) {
  console.error('AI check failed. Code:', err.code ?? err.name);
  process.exit(1);
}