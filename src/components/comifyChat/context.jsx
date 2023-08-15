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
  subTopics,
  subTopic,
  askSubQuery,
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
      options: topics.map((item) => item.topic),
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
      content: "We just need some information from you to proceed:",
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
    // const subTopics = topics?.find((i) => i.topic === topic)?.subTopics || [];

    messages.unshift({
      _id: "queryQuery",
      role: "system",
      content:
        topics?.find((t) => t.topic === topic)?.contextForUsers ||
        "Please ask your question",
      createdAt: chatStartedAt,
    });

    if (subTopics?.length) {
      messages.unshift({
        role: "system",
        _id: "subTopicQuery",
        type: "suggestion",
        options: subTopics.map((item) => item.topic),
        createdAt: chatStartedAt,
      });
      if (subTopic) {
        messages.unshift({
          _id: "subTopicResponse",
          role: "user",
          content: subTopic,
          createdAt: chatStartedAt,
        });
      }
      if (askSubQuery) {
        messages.unshift({
          _id: "subQueryQuery",
          role: "system",
          content:
            subTopics?.find((t) => t.topic === subTopic)?.contextForUsers ||
            "Please ask your question",
          createdAt: chatStartedAt,
        });
      }
    }
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

export const ChatContextProvider = ({
  chatbot_id,
  children,
  endpoints,
  containerId,
  blacklistedPaths,
  paths,
  standalone: defaultStand,
}) => {
  const msgChannel = useRef();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [chatbotConfig, setChatbotConfig] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [convo, setConvo] = useState(null);
  const [topics, setTopics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [show, setShow] = useState(false);
  const [standalone, setStandalone] = useState(
    typeof defaultStand === "boolean" ? defaultStand : false
  );
  const [initMessages, setInitMessages] = useState(
    generateMessages({ topics: [] })
  );
  const [botStatus, setBotStatus] = useState("active");

  const { get: getChat } = useFetch(endpoints.chat, {
    "x-chatbot-id": chatbot_id,
  });
  const { get: getConfig } = useFetch(endpoints.chatbotConfig, {
    "x-chatbot-id": chatbot_id,
  });

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

    window[`infinai_toast_timeout_${chatbot_id}_${id}`] = setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
      delete window[`infinai_toast_timeout_${chatbot_id}_${id}`];
    }, 3000);
  }, []);
  const pushToast = {
    success: (message) => _pushToast("success", message),
    error: (message) => _pushToast("error", message),
  };

  const unmountChat = useCallback(() => {
    setTimeout(() => {
      const container = document.getElementById(containerId);
      setBotStatus("inactive");
      if (container) {
        container.remove();
      }
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", () => resizeWindow());
    resizeWindow();

    getConfig({ params: { ":chatbot_id": chatbot_id } })
      .then(async ({ data }) => {
        if (data.success) {
          const { topics, ...rest } = data.data;
          setChatbotConfig(rest);
          setTopics(topics);
          if (rest.primaryColor) {
            const rgb = hexToRgba(rest.primaryColor);
            if (rgb.length >= 3) {
              document
                .querySelector(":root")
                .style.setProperty("--primary-color", rgb.join(", "));
            }
          }
          return { topics, config: rest };
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
                const topic = topics.find((t) => t.topic === data.data.topic);
                const subTopic = topic?.subTopics?.find(
                  (t) => t.topic === data.data.subTopic
                );
                setInitMessages(
                  generateMessages({
                    chatStartedAt: new Date(data.data.createdAt),
                    topics,
                    ...(topic && {
                      topic: topic.topic,
                      askQuery: true,
                      ...(subTopic && {
                        subTopics: topic.subTopics,
                        subTopic: subTopic.topic,
                        askSubQuery: true,
                      }),
                    }),
                  })
                );
              } else {
                setConvo({
                  user: {
                    name: localStorage.getItem("infinai_chat_user_name"),
                    email: localStorage.getItem("infinai_chat_user_email"),
                  },
                });
              }
            })
            .catch((err) => console.log(err));
        } else {
          setConvo({
            user: {
              name: localStorage.getItem("infinai_chat_user_name"),
              email: localStorage.getItem("infinai_chat_user_email"),
            },
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

    msgChannel.current = new BroadcastChannel(
      `infinai-chat-message-${chatbot_id}`
    );
    const handleMessage = ({ data: { messages } }) => {
      setMessages(messages);
    };
    msgChannel.current.addEventListener("message", handleMessage);

    return () => {
      msgChannel.current.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    let oldPathname = window.location.pathname;
    const body = document.querySelector("body");
    const observer = new MutationObserver((mutations) => {
      const newPathname = window.location.pathname;
      if (oldPathname !== newPathname) {
        oldPathname = newPathname;
        setCurrentPath(newPathname);
      }
    });
    observer.observe(body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setShow(
      (paths
        ? paths.some((path) => currentPath.match(new RegExp(`${path}$`)))
        : true) &&
        (blacklistedPaths ? !blacklistedPaths.includes(currentPath) : true)
    );
    if (Array.isArray(defaultStand) && defaultStand.length) {
      if (defaultStand.includes(currentPath)) {
        setStandalone(true);
      } else {
        setStandalone(false);
      }
    }
  }, [currentPath]);

  return (
    <ChatContext.Provider
      value={{
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
        chatbot_id,
        standalone,
        currentPath,
        setCurrentPath,
      }}
    >
      {chatbotConfig && botStatus === "active" && show ? children : null}
    </ChatContext.Provider>
  );
};
