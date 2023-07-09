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
  url,
  askUrl,
  name,
  askName,
  email,
  askEmail,
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
  // if (askName || name) {
  //   messages.unshift({
  //     _id: "nameQuery",
  //     role: "system",
  //     content: "Please enter your name",
  //     createdAt: chatStartedAt,
  //   });
  // }
  // if (name) {
  //   messages.unshift({
  //     _id: "nameResponse",
  //     role: "user",
  //     content: name,
  //     createdAt: chatStartedAt,
  //   });
  // }
  // if (askEmail || email) {
  //   messages.unshift({
  //     _id: "emailQuery",
  //     role: "system",
  //     content: "Please enter your email",
  //     createdAt: chatStartedAt,
  //   });
  // }
  // if (email) {
  //   messages.unshift({
  //     _id: "emailResponse",
  //     role: "user",
  //     content: email,
  //     createdAt: chatStartedAt,
  //   });
  // }
  // if (askUrl || url) {
  //   messages.unshift({
  //     _id: "urlQuery",
  //     role: "system",
  //     content: "Please enter a URL",
  //     createdAt: chatStartedAt,
  //   });
  // }
  // if (url) {
  //   messages.unshift({
  //     _id: "urlResponse",
  //     role: "user",
  //     content: url,
  //     createdAt: chatStartedAt,
  //   });
  // }
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

export const ChatContextProvider = ({ children, endpoints, defaultUrl }) => {
  const msgChannel = useRef();
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

  const unmountChat = useCallback(() => {
    setTimeout(() => {
      const container = document.querySelector("#comifyChat_container");
      setBotStatus("inactive");
      if (container) {
        container.remove();
      }
    }, 3000);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", () => resizeWindow());
    resizeWindow();

    getTopics()
      .then(({ data }) => {
        if (data.success) {
          setTopics(data.data);
          // setInitMessages(
          //   generateMessages({
          //     topics,
          //   })
          // );
          // setInitMessages((prev) =>
          //   prev.map((item) =>
          //     item._id === "topicQuery" ? { ...item, options: data.data } : item
          //   )
          // );
          return data.data;
        } else {
          return null;
          // alert(data.message);
        }
      })
      .then((topics) => {
        const chatId = localStorage.getItem("comify_chat_id");
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
                    topic: data.data.topic,
                    // url: data.data.url,
                    // name: data.data.user.name,
                    // email: data.data.user.email,
                    askQuery: true,
                  })
                );
              } else {
                setConvo({
                  topic: defaultUrl,
                  name: localStorage.getItem("comify_chat_user_name"),
                  email: localStorage.getItem("comify_chat_user_email"),
                });
              }
            })
            .catch((err) => console.log(err));
        } else {
          setConvo({
            topic: !topics?.length ? defaultUrl : null,
            topics,
            name: localStorage.getItem("comify_chat_user_name"),
            email: localStorage.getItem("comify_chat_user_email"),
          });
          setInitMessages(
            generateMessages({
              topics,
              // topic: !topics?.length ? defaultUrl : null,
            })
          );
        }
      })
      .catch((err) => {
        pushToast.error(err.message);
        if (err.status === 401) {
          unmountChat();
        }
      });

    const name = localStorage.getItem("comify_chat_user_name");
    const email = localStorage.getItem("comify_chat_user_email");
    if (name && email) {
      setUser({ name, email });
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
        initMessages,
        setInitMessages,
      }}
    >
      {botStatus === "active" ? children : null}
    </ChatContext.Provider>
  );
};
