import React, { createContext, useState, useEffect, useRef } from "react";
import useFetch from "./utils/useFetch";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, endpoints }) => {
  const msgChannel = useRef();
  const [user, setUser] = useState(null);
  const [convo, setConvo] = useState(null);
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);

  const { get: getTopics } = useFetch(endpoints.topics);
  const { get: getChat } = useFetch(endpoints.chat);

  useEffect(() => {
    getTopics()
      .then(({ data }) => {
        if (data.success) {
          setTopics(data.data);
        } else {
          // alert(data.message);
        }
      })
      .catch((err) => alert(err.message));

    if (localStorage.getItem("comify_chat_id")) {
      getChat({
        params: {
          ":chat_id": localStorage.getItem("comify_chat_id"),
        },
      })
        .then(({ data }) => {
          if (data.success) {
            setConvo({ ...data.data, messages: undefined });
            setMessages(data.data.messages.reverse());
          }
        })
        .catch((err) => console.log(err));
    }

    msgChannel.current = new BroadcastChannel("comify-chat-message");
    const handleMessage = ({ data: { messages } }) => {
      setMessages(messages);
    };
    msgChannel.current.addEventListener("message", handleMessage);

    return () => {
      msgChannel.current.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        user,
        setUser,
        topics,
        setTopics,
        convo,
        setConvo,
        messages,
        setMessages,
        endpoints,
        msgChannel: msgChannel.current,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
