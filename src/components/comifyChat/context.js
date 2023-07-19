import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import useFetch from "./utils/useFetch.js";

export const ChatContext = createContext();

export const generateMessages = ({
  chatStartedAt = new Date(),
  topics,
  topic,
  askUserDetail,
  askQuery,
  queryResponse,
}) => {
  const messages = [
    {
      _id: "greetings",
      role: "system",
      content: topics?.length
        ? "Hello, how may I help you today? Please pick a topic from below with which I can assist you:"
        : "Hello, how may I help you today?",
      createdAt: chatStartedAt,
    },
  ];
  if (topics?.length) {
    messages.unshift({
      _id: "topicQuery",
      type: "suggestion",
      options: topics,
      createdAt: chatStartedAt,
    });
  }
  if (topic) {
    messages.unshift({
      _id: "topicResponse",
      role: "user",
      content: topic,
      createdAt: chatStartedAt,
    });
  }
  if (queryResponse) {
    messages.unshift({
      _id: "queryResponse",
      role: "user",
      content: queryResponse,
      createdAt: chatStartedAt,
    });
  }
  if (askUserDetail) {
    messages.unshift({
      _id: "askUserDetail",
      role: "system",
      type: "form",
      content: "We just need some more infomration from you to proceed:",
      createdAt: chatStartedAt,
      fields: [
        {
          inputType: "input",
          label: "Name",
          type: "text",
          name: "name",
          required: true,
        },
        {
          inputType: "input",
          label: "Email",
          type: "email",
          name: "email",
          required: true,
        },
      ],
    });
  }
  if (askQuery) {
    messages.unshift({
      _id: "queryQuery",
      role: "system",
      content: "Please ask your question",
      createdAt: chatStartedAt,
    });
  }
  return messages;
};

function resizeWindow() {
  let vh = window.innerHeight * 0.01;
  document.body.style.setProperty("--vh", `${vh}px`);
}

function hexToRgba(hex) {
  // Remove the hash symbol if present
  hex = hex.replace("#", "");

  // Handle shorthand hex values and convert them to full-length
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, "$1$1");
  }

  // Extract the individual RGBA components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;

  return [r, g, b];
}

export const ChatContextProvider = ({ chatbot_id, children, endpoints }) => {
  const msgChannel = useRef();
  const [chatbotConfig, setChatbotConfig] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [user, setUser] = useState(null);
  const [convo, setConvo] = useState(null);
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [initMessages, setInitMessages] = useState(
    generateMessages({ topics: [] })
  );
  const [botStatus, setBotStatus] = useState("active");

  const { get: getTopics } = useFetch(endpoints.topics);
  const { get: getChat } = useFetch(endpoints.chat);
  const { get: getConfig } = useFetch(endpoints.chatbotConfig);

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

    window[`infinai_toast_timeout_${id}`] = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      delete window[`infinai_toast_timeout_${id}`];
    }, 3000);
  }, []);
  const pushToast = {
    success: (message) => _pushToast("success", message),
    error: (message) => _pushToast("error", message),
  };

  const unmountChat = useCallback(() => {
    setTimeout(() => {
      const container = document.querySelector("#infinaiChat_container");
      setBotStatus("inactive");
      if (container) {
        container.remove();
      }
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", () => resizeWindow());
    resizeWindow();

    sessionStorage.setItem("infinai_chatbot_id", chatbot_id);

    getConfig({ params: { ":chatbot_id": chatbot_id } })
      .then(async ({ data }) => {
        if (data.success) {
          setChatbotConfig(data.data);
          if (data.data.primaryColor) {
            const rgb = hexToRgba(data.data.primaryColor);
            if (rgb.length >= 3) {
              document
                .querySelector(":root")
                .style.setProperty("--primary-color", rgb.join(", "));
            }
          }
          let topics = await getTopics().then(({ data }) => {
            if (data.success) {
              setTopics(data.data);
              return data.data;
            } else {
              return null;
            }
          });
          return {
            topics,
            config: data.data,
          };
        }
      })
      .then(({ config, topics }) => {
        const chatId = localStorage.getItem("infinai_chat_id");
        if (chatId) {
          getChat({
            params: {
              ":chat_id": chatId,
            },
          })
            .then(({ data }) => {
              if (data.success) {
                setConvo({ ...data.data, topics, messages: undefined });
                setMessages(data.data.messages.reverse());
                setInitMessages(
                  generateMessages({
                    chatStartedAt: new Date(data.data.createdAt),
                    topics,
                    ...(topics.includes(data.data.topic) && {
                      topic: data.data.topic,
                      askQuery: true,
                    }),
                  })
                );
              } else {
                setConvo({
                  name: localStorage.getItem("infinai_chat_user_name"),
                  email: localStorage.getItem("infinai_chat_user_email"),
                });
              }
            })
            .catch((err) => console.log(err));
        } else {
          setConvo({
            topics,
            name: localStorage.getItem("infinai_chat_user_name"),
            email: localStorage.getItem("infinai_chat_user_email"),
          });
          setInitMessages(generateMessages({ topics }));
        }
      })
      .catch((err) => {
        pushToast.error(err.message);
        if (err.status === 401) {
          unmountChat();
        }
      });

    const name = localStorage.getItem("infinai_chat_user_name");
    const email = localStorage.getItem("infinai_chat_user_email");
    if (name && email) {
      setUser({ name, email });
    }

    msgChannel.current = new BroadcastChannel("infinai-chat-message");
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
        initMessages,
        setInitMessages,
        chatbotConfig,
        setChatbotConfig,
      }}
    >
      {chatbotConfig && botStatus === "active" ? children : null}
    </ChatContext.Provider>
  );
};
