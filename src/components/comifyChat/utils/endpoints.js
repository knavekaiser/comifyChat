const getEndpoints = (baseUrl = "http://localhost:8060") => {
  return {
    baseUrl,
    topics: `${baseUrl}/api/chat/topics`,
    chat: `${baseUrl}/api/chat/:chat_id`,
    message: `${baseUrl}/api/chat/:chat_id/:message_id`,
    chatbotConfig: `${baseUrl}/api/get-chatbot/:chatbot_id`,
  };
};

export default getEndpoints;
