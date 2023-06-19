import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import useFetch from "./utils/useFetch.js";

export const ChatContext = createContext();

export const ChatContextProvider = ({ children, endpoints }) => {
  const msgChannel = useRef();
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [convo, setConvo] = useState(null);
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);

  const { get: getTopics } = useFetch(endpoints.topics);
  const { get: getChat } = useFetch(endpoints.chat);

  const _pushToast = useCallback((type, message) => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [
      {
        id,
        type,
        message,
      },
      ...prev,
    ]);

    window[`comify_toast_timeout_${id}`] = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      delete window[`comify_toast_timeout_${id}`];
    }, 3000);
  }, []);
  const pushToast = {
    success: (message) => _pushToast("success", message),
    error: (message) => _pushToast("error", message),
  };

  useEffect(() => {
    getTopics()
      .then(({ data }) => {
        if (data.success) {
          setTopics(data.data);
        } else {
          // alert(data.message);
        }
      })
      .catch((err) => pushToast.error(err.message));

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
        toasts,
        setToasts,
        pushToast,
        msgChannel: msgChannel.current,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
