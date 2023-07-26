import ReactDOM from "react-dom/client";
import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useContext,
  Fragment,
} from "react";
import s from "./style.module.scss";
import { useFetch } from "./utils/useFetch.js";
import getEndpoints from "./utils/endpoints.js";
import {
  ChatContextProvider,
  ChatContext,
  generateMessages,
} from "./context.jsx";
import { Toast } from "./toast.jsx";
import {
  Check,
  Clear,
  Expand,
  ThumbsDown,
  ThumbsDownOutline,
  ThumbsUp,
  ThumbsUpOutline,
  Contract,
  Close,
  Home,
  Clipboard,
  Send,
} from "./icons.jsx";
import { Moment } from "./moment.jsx";

export default function InfinAIChat({
  baseUrl = "https://comify.in",
  openAtStart,
  chatbotId,
  standalone,
  containerId,
  blacklistedPaths,
  paths,
} = {}) {
  if (!chatbotId) {
    return console.error(
      "chatbotId has not been provided. Please provide chatbotId"
    );
  }

  let container = null;
  if (containerId) {
    container = document.getElementById(containerId);
    if (!container) {
      console.error("Plase provide id of a div that exist.");
      return;
    }
  } else {
    containerId = `infinaiChat_container_${chatbotId}`;
    container = document.createElement("div");
    container.id = containerId;
    document.body.appendChild(container);
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ChatContextProvider
        chatbot_id={chatbotId}
        endpoints={getEndpoints(baseUrl)}
        containerId={containerId}
        paths={paths}
        blacklistedPaths={blacklistedPaths}
        standalone={standalone}
      >
        <ChatContainer openAtStart={openAtStart} />
      </ChatContextProvider>
    </React.StrictMode>
  );
}

export function ChatContainer({ openAtStart }) {
  const [fullScreen, setFullScreen] = useState(false);
  const { chatbotConfig, toasts, standalone } = useContext(ChatContext);
  const [open, setOpen] = useState(openAtStart || false);

  useEffect(() => {
    const handler = () => {
      console.log("location changed", window.location.pathname);
    };
    window.addEventListener("locationchange", handler);
    return () => {
      window.removeEventListener("locationchange", handler);
    };
  }, []);

  return (
    <div
      className={`infinai_chat_container ${s.chatContainer} ${
        standalone ? s.standalone : ""
      }`}
    >
      <div
        id="infinaiChatTostContainer"
        className={`infinai_chat_toast_container ${s.toastContainer}`}
      >
        {toasts.map((item) => (
          <Toast
            key={item.id}
            id={item.id}
            type={item.type}
            message={item.message}
          />
        ))}
      </div>
      {open || standalone ? (
        <Chat
          setOpen={setOpen}
          fullScreen={fullScreen}
          setFullScreen={setFullScreen}
        />
      ) : (
        <Avatar onClick={() => setOpen(true)} src={chatbotConfig?.avatar} />
      )}
    </div>
  );
}

const wait = (ms) => new Promise((res, rej) => setTimeout(() => res(true), ms));

const Chat = ({ setOpen, fullScreen, setFullScreen }) => {
  const chatRef = useRef();
  const {
    chatbot_id,
    chatbotConfig,
    unmountChat,
    endpoints,
    convo,
    setConvo,
    messages,
    msgChannel,
    setMessages,
    pushToast,
    initMessages,
    setInitMessages,
    topics,
    standalone,
  } = useContext(ChatContext);
  const [currInput, setCurrInput] = useState("");

  const messagesRef = useRef();

  const { post: castVote, loading } = useFetch(endpoints.message, {
    "x-chatbot-id": chatbot_id,
  });
  const vote = useCallback(
    (msg_id, vote) => {
      castVote(
        { like: vote },
        {
          params: {
            ":chat_id": convo._id,
            ":message_id": msg_id,
          },
        }
      )
        .then(({ data }) => {
          if (!data.success) {
            return pushToast.error(data.message);
          }

          setMessages((prev) => {
            const messages = prev.map((item) =>
              item._id === msg_id ? { ...item, like: vote } : item
            );
            msgChannel.postMessage({ messages });
            return messages;
          });
        })
        .catch((err) => pushToast.error(err.message));
    },
    [convo]
  );

  const { post: sendMessage, loading: initiatingChat } = useFetch(
    endpoints.chat,
    { "x-chatbot-id": chatbot_id }
  );
  const initChat = useCallback(
    (msg, userDetail = {}, { reloadInit } = {}) => {
      let payload = {
        name: convo?.user?.name,
        email: convo?.user?.email,
        ...userDetail,
        message: msg,
        topic: convo.topic,
      };
      sendMessage(payload, { params: { ":chat_id": "" } })
        .then(({ data }) => {
          if (!data.success) {
            return pushToast.error(data.message);
          }
          localStorage.setItem("infinai_chat_id", data.data._id);
          localStorage.setItem("infinai_chat_user_name", data.data.user.name);
          localStorage.setItem("infinai_chat_user_email", data.data.user.email);
          if (reloadInit) {
            setInitMessages(
              generateMessages({
                topics,
                ...(topics.some((t) => t.topic === data.data.topic) && {
                  topic: data.data.topic,
                  askQuery: true,
                }),
              })
            );
          }
          setConvo({ ...data.data, messages: undefined });
          msgChannel.postMessage({ messages: data.data.messages.reverse() });
          setMessages(data.data.messages);
        })
        .catch((err) => {
          pushToast.error(err.message);
          if (err.status === 401) {
            setOpen(false);
            unmountChat();
          }
        });
    },
    [convo, chatbotConfig]
  );

  return (
    <div
      className={`infinai_chat ${s.chat} ${fullScreen ? s.fullScreen : ""}`}
      ref={chatRef}
    >
      <div className={s.header}>
        <div className={s.left}>
          <div className={s.companyDetail}>
            {chatbotConfig?.avatar && (
              <img src={endpoints.baseUrl + chatbotConfig.avatar} />
            )}
            <div>
              <p className={s.ellepsis}>
                {chatbotConfig?.display_name || "Infin AI"}
              </p>
              {convo?.topic && (
                <>
                  {/* <span>•</span> */}
                  <span
                    title={convo.topic}
                    className={`${s.title} ${s.ellepsis}`}
                  >
                    {convo.topic}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={s.right}>
          <button
            className={s.clearBtn}
            onClick={() => {
              setConvo((prev) => {
                if (prev?.user?.name && prev?.user?.email) {
                  localStorage.setItem(
                    "infinai_chat_user_name",
                    prev.user.name
                  );
                  localStorage.setItem(
                    "infinai_chat_user_email",
                    prev.user.email
                  );
                  return { user: prev.user };
                }
                return {};
              });
              setCurrInput("query");
              msgChannel.postMessage({ messages: [] });
              setInitMessages(generateMessages({ topics }));
              setMessages([]);
              localStorage.removeItem("infinai_chat_id");
            }}
          >
            <Clear />
          </button>
          <button
            className={s.home}
            onClick={() => {
              messagesRef.current.scrollTop = -messagesRef.current.scrollHeight;
            }}
          >
            <Home />
          </button>
          {window.innerWidth >= 480 && (
            <button
              className={s.closeBtn}
              onClick={() => {
                if (fullScreen) {
                  if (document.exitFullscreen) {
                    document.exitFullscreen();
                  } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                  } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                  }
                } else {
                  if (chatRef.current.requestFullscreen) {
                    chatRef.current.requestFullscreen();
                  } else if (chatRef.current.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                  } else if (chatRef.current.msRequestFullscreen) {
                    chatRef.current.msRequestFullscreen();
                  }
                }
                setFullScreen(!fullScreen);
              }}
            >
              {fullScreen ? (
                <Contract className={s.fullScreen} />
              ) : (
                <Expand className={s.fullScreen} />
              )}
            </button>
          )}
          {!standalone && (
            <button
              className={s.closeBtn}
              onClick={() => {
                setOpen(false);
                if (fullScreen) {
                  if (document.exitFullscreen) {
                    document.exitFullscreen();
                  } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                  } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                  }
                  setFullScreen(false);
                }
              }}
            >
              <Close />
            </button>
          )}
        </div>
      </div>

      <div className={s.messages} ref={messagesRef}>
        {(convo?._id ? [...messages, ...initMessages] : initMessages).map(
          (item, i, arr) => (
            <Fragment key={item._id}>
              {item.type === "form" && (
                <MessageForm
                  msg={item}
                  onSubmit={(values) => {
                    setConvo((prev) => ({
                      ...prev,
                      user: {
                        name: values.name,
                        email: values.email,
                      },
                    }));
                    const query = initMessages.find(
                      (item) => item._id === "queryResponse"
                    )?.content;
                    if (query) {
                      setCurrInput("");
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: convo.topic,
                          queryResponse: query,
                        })
                      );
                      initChat(
                        query,
                        {
                          name: values.name,
                          email: values.email,
                        },
                        { reloadInit: true }
                      );
                    } else {
                      setCurrInput("query");
                      return setInitMessages(
                        generateMessages({
                          topics,
                          topic: convo.topic,
                          askQuery: true,
                        })
                      );
                    }
                  }}
                />
              )}
              {item.type === "suggestion" && (
                <Suggestions
                  options={[...item.options]}
                  active={convo?.topic}
                  onChange={async (input) => {
                    await wait(200);

                    const name = convo?.user?.name;
                    const email = convo?.user?.email;

                    setConvo((prev) => ({
                      topic: input,
                      user: prev?.user,
                    }));

                    if (!name || !email) {
                      setCurrInput("userDetail");
                      return setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          askUserDetail: true,
                        })
                      );
                    }

                    setTimeout(() => (messagesRef.current.scrollTop = 0), 20);

                    if (!convo?._id) {
                      if (!name || !email) {
                        setCurrInput("userDetail");
                        return;
                      }
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          ...(name ? { name } : { askName: true }),
                          ...(email ? { email } : { askEmail: !!name }),
                          ...(name && email ? { askQuery: true } : {}),
                        })
                      );
                    } else {
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          input,
                          name,
                          email,
                          askQuery: true,
                        })
                      );
                      setCurrInput("query");

                      setMessages([]);
                      localStorage.removeItem("infinai_chat_id");
                      messagesRef.current.scrollTop = 0;
                    }
                  }}
                  style={{
                    marginBottom:
                      arr[i - 1]?.type === "suggestion"
                        ? 5
                        : arr[i - 1] && arr[i - 1]?.role !== item.role
                        ? 25
                        : 0,
                  }}
                />
              )}
              {!("type" in item) && (
                <Message
                  msg={item}
                  loading={loading}
                  style={{
                    marginBottom:
                      arr[i - 1]?.type === "suggestion"
                        ? 5
                        : arr[i - 1] && arr[i - 1]?.role !== item.role
                        ? 25
                        : 0,
                  }}
                  castVote={vote}
                />
              )}
              {new Date(item.createdAt).getDate() !==
                new Date(arr[i + 1]?.createdAt).getDate() && (
                <div className={s.msgDate}>
                  <Moment format="DD MMM YYYY">{item.createdAt}</Moment>
                </div>
              )}
            </Fragment>
          )
        )}
      </div>

      {!convo?._id && currInput !== "userDetail" && (
        <ChatForm
          onSubmit={(values, options) => {
            const name =
              convo?.user?.name ||
              localStorage.getItem("infinai_chat_user_name");
            const email =
              convo?.user?.email ||
              localStorage.getItem("infinai_chat_user_email");

            if (!name || !email) {
              setInitMessages(
                generateMessages({
                  queryResponse: values.msg,
                  askUserDetail: true,
                })
              );
              setCurrInput("userDetail");
              return;
            }
            initChat(values.msg, { name, email });
            setCurrInput("query");
          }}
          scrollDown={() => {
            messagesRef.current.scrollTop = 0;
          }}
          loading={initiatingChat}
        />
      )}

      {convo?._id && (
        <ChatForm
          scrollDown={() => {
            messagesRef.current.scrollTop = 0;
          }}
        />
      )}
      <div className={s.footer}>
        Powered by:{" "}
        <a href="https://infinai.in" target="_blank">
          Infin AI
        </a>
      </div>
    </div>
  );
};

const Avatar = ({ onClick, src }) => {
  const { endpoints } = useContext(ChatContext);
  return (
    <div
      className={`infinai_chat_avatar ${s.avatar} ${src ? s.custom : ""}`}
      onClick={onClick}
    >
      {src ? (
        <img src={endpoints.baseUrl + src} />
      ) : (
        <>
          {/* <img
        src={endpoints.baseUrl + "/assets/sdk/infinai-chat-avatar/circle.webp"}
      /> */}
          <div className={s.circle} />
          <img
            className={s.hand}
            src={
              endpoints.baseUrl + "/assets/sdk/infinai-chat-avatar/hand.webp"
            }
          />
          <img
            src={
              endpoints.baseUrl + "/assets/sdk/infinai-chat-avatar/body.webp"
            }
          />
          <img
            className={s.head}
            src={
              endpoints.baseUrl + "/assets/sdk/infinai-chat-avatar/head.webp"
            }
          />
        </>
      )}
    </div>
  );
};

const Message = ({ msg, castVote, loading, style }) => {
  const { chatbotConfig, convo, endpoints } = useContext(ChatContext);

  return (
    <div className={`${s.msg} ${s[msg.role]}`} style={style}>
      {msg.role !== "user" && (
        <div
          className={`${s.msgAvatar} ${s.assistant} ${
            chatbotConfig?.avatar ? s.custom : ""
          }`}
        >
          <img
            className={s.hand}
            src={
              endpoints.baseUrl +
              (chatbotConfig?.avatar ||
                "/assets/sdk/infinai-chat-avatar/full.webp")
            }
          />
          <Moment format="hh:mm">{msg.createdAt}</Moment>
        </div>
      )}
      <div className={s.content}>
        <p>{msg.content}</p>
        {msg.role === "assistant" && (
          <div className={s.actions}>
            <CopyBtn content={msg.content} />
            <button
              className={s.btn}
              title="Like"
              disabled={loading}
              onClick={() => castVote(msg._id, msg.like ? null : true)}
            >
              {msg.like === true ? <ThumbsUp /> : <ThumbsUpOutline />}
            </button>
            <button
              className={s.btn}
              title="Dislike"
              disabled={loading}
              onClick={() =>
                castVote(msg._id, msg.like === false ? null : false)
              }
            >
              {msg.like === false ? <ThumbsDown /> : <ThumbsDownOutline />}
            </button>
          </div>
        )}
      </div>
      {msg.role === "user" && (
        <div className={s.msgAvatar}>
          <div className={s.img}>
            {convo?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <Moment format="hh:mm">{msg.createdAt}</Moment>
        </div>
      )}
    </div>
  );
};

const MessageForm = ({ msg, style, onSubmit }) => {
  const [values, setValues] = useState({});
  const { chatbotConfig, endpoints } = useContext(ChatContext);

  return (
    <div className={`${s.msg} ${s.form}`} style={style}>
      {msg.role !== "user" && (
        <div
          className={`${s.msgAvatar} ${s.assistant} ${
            chatbotConfig?.avatar ? s.custom : ""
          }`}
        >
          <img
            className={s.hand}
            src={
              endpoints.baseUrl +
              (chatbotConfig?.avatar ||
                "/assets/sdk/infinai-chat-avatar/full.webp")
            }
          />
          <Moment format="hh:mm">{msg.createdAt}</Moment>
        </div>
      )}
      <div className={s.content}>
        <p>{msg.content}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(values);
          }}
        >
          {(msg.fields || []).map((field) => {
            if (field.inputType === "input") {
              return (
                <section key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    name={field.name}
                    required={field.required}
                    value={values[field.name] || ""}
                    type={field.type || "text"}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.name]: e.target.value,
                      }))
                    }
                  />
                </section>
              );
            }
            return null;
          })}
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
};

const Suggestions = ({ options, active, onChange, style }) => {
  return (
    <div className={s.suggestions} style={{ ...style }}>
      {options.map((item) => (
        <button
          disabled={item === active}
          className={`${s.chip} ${item === active ? s.active : ""}`}
          key={item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

const CopyBtn = ({ content }) => {
  const timer = useRef();
  const [done, setDone] = useState(false);
  return (
    <button
      className={s.btn}
      title="Copy"
      onClick={() => {
        navigator.clipboard.writeText(content);
        setDone(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setDone(false);
        }, 1000);
      }}
    >
      {done ? <Check /> : <Clipboard className={s.clipboard} />}
    </button>
  );
};

const ChatForm = ({
  setOpen,
  inputOptions,
  scrollDown,
  onSubmit,
  loading: defaultLoading,
}) => {
  const { chatbot_id, endpoints, convo, setMessages, msgChannel, pushToast } =
    useContext(ChatContext);
  const [msg, setMsg] = useState("");
  const { post: sendMessage, loading } = useFetch(endpoints.chat, {
    "x-chatbot-id": chatbot_id,
  });
  const submit = useCallback(
    (e) => {
      e.preventDefault();
      scrollDown();

      sendMessage({ content: msg }, { params: { ":chat_id": convo._id } })
        .then(({ data }) => {
          if (!data.success) {
            return pushToast.error(data.message);
          }
          setMessages((prev) => {
            const messages = [
              data.data,
              {
                _id: Math.random().toString(36).substr(-8),
                role: "user",
                name: "Guest",
                content: msg,
                createdAt: new Date(),
              },
              ...prev,
            ];
            msgChannel.postMessage({ messages });
            return messages;
          });
          setMsg("");
          setTimeout(() => scrollDown(), 50);
        })
        .catch((err) => {
          pushToast.error(err.message);
          if (err.status === 401) {
            setOpen(false);
            unmountChat();
          }
        });
    },
    [msg]
  );
  return (
    <form
      className={s.chatForm}
      onSubmit={
        onSubmit
          ? (e) => {
              e.preventDefault();
              onSubmit(
                { msg },
                {
                  clearForm: () => {
                    setMsg("");
                  },
                }
              );
            }
          : submit
      }
    >
      <input
        autoFocus
        readOnly={loading || defaultLoading}
        {...inputOptions}
        placeholder="Type a message"
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        className={s.input}
      />
      <button
        className={s.sendBtn}
        disabled={loading || defaultLoading || !msg.trim()}
      >
        {defaultLoading || loading ? (
          <>
            <span className={s.dot} />
            <span className={s.dot} />
            <span className={s.dot} />
          </>
        ) : (
          <Send />
        )}
      </button>
    </form>
  );
};
