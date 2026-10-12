import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';

export const WINDOW_DAYS = 90;
export const MIN_CONVERSATIONS = 3;
const MAX_CONVERSATIONS = 200;

// The middle value of a list of numbers (average of the two middle ones
// for even lengths), or null for an empty list.
export const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// "within an hour", "within 3 hours", "within a day", "within 3 days".
export const describeResponseTime = (ms) => {
  if (ms == null) return null;
  const hours = ms / (60 * 60 * 1000);
  if (hours <= 1) return 'within an hour';
  if (hours < 24) return `within ${Math.ceil(hours)} hours`;
  const days = Math.ceil(hours / 24);
  return days === 1 ? 'within a day' : `within ${days} days`;
};

// How reliably and quickly an owner answers people who message them about
// their listings, over the last 90 days. A conversation counts as answered
// when the owner sent any message after the first one from the other side.
// Returns null until there are enough conversations to be meaningful.
export const getResponseStats = async (ownerId) => {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const conversations = await Conversation.find({ owner: ownerId, createdAt: { $gte: since } }, '_id buyer')
    .sort({ createdAt: -1 })
    .limit(MAX_CONVERSATIONS)
    .lean();
  if (conversations.length < MIN_CONVERSATIONS) return null;

  const messages = await Message.find(
    { conversation: { $in: conversations.map((c) => c._id) } },
    'conversation sender createdAt'
  )
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const byConversation = new Map(conversations.map((c) => [c._id.toString(), { buyer: c.buyer.toString(), messages: [] }]));
  messages.forEach((m) => byConversation.get(m.conversation.toString())?.messages.push(m));

  const responseTimes = [];
  let considered = 0;
  for (const { buyer, messages: thread } of byConversation.values()) {
    const firstAsk = thread.find((m) => m.sender.toString() === buyer);
    if (!firstAsk) continue;
    considered += 1;
    const reply = thread.find((m) => m.sender.toString() === String(ownerId) && m.createdAt > firstAsk.createdAt);
    if (reply) responseTimes.push(reply.createdAt - firstAsk.createdAt);
  }
  if (considered < MIN_CONVERSATIONS) return null;

  const medianMs = median(responseTimes);
  return {
    conversations: considered,
    responseRate: Math.round((responseTimes.length / considered) * 100),
    medianResponseMs: medianMs,
    responseTime: describeResponseTime(medianMs),
  };
};
