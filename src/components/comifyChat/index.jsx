import ReactDOM from "react-dom/client";
import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useContext,
} from "react";
import s from "./style.module.scss";
import { useFetch } from "./utils/useFetch.js";
import getEndpoints from "./utils/endpoints.js";
import {
  ChatContextProvider,
  ChatContext,
  generateMessages,
} from "./context.js";
import { Toast } from "./toast.js";
import Icon from "./icons.js";

export default function ComifyChat({
  baseUrl = "https://comify.in",
  openAtStart,
} = {}) {
  const containerId = "comifyChat_container";

  const container = document.createElement("div");
  container.id = containerId;
  document.body.appendChild(container);

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ChatContextProvider endpoints={getEndpoints(baseUrl)}>
        <ChatContainer openAtStart={openAtStart} />
      </ChatContextProvider>
    </React.StrictMode>
  );
}

export function ChatContainer({ openAtStart }) {
  const [fullScreen, setFullScreen] = useState(false);
  const { setUser, toasts } = useContext(ChatContext);
  const [open, setOpen] = useState(openAtStart || false);

  return (
    <div className={s.chatContainer}>
      <div id="comifyChatTostContainer" className={s.toastContainer}>
        {toasts.map((item) => (
          <Toast
            key={item.id}
            id={item.id}
            type={item.type}
            message={item.message}
          />
        ))}
      </div>
      {open ? (
        <Chat
          setOpen={setOpen}
          setUser={setUser}
          fullScreen={fullScreen}
          setFullScreen={setFullScreen}
        />
      ) : (
        <Avatar onClick={() => setOpen(true)} />
        // <button className={s.chatTglBtn} onClick={() => setOpen(true)}>
        //   <Icon name="message" />
        // </button>
      )}
    </div>
  );
}

const wait = (ms) => new Promise((res, rej) => setTimeout(() => res(true), ms));

const Chat = ({ setOpen, fullScreen, setFullScreen }) => {
  const chatRef = useRef();
  const {
    setUser,
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
  } = useContext(ChatContext);

  const messagesRef = useRef();

  const { post: castVote, loading } = useFetch(endpoints.message);
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

  const { post: initChat_post, loading: initiatingChat } = useFetch(
    endpoints.chat
  );
  const initChat = useCallback(
    (msg) => {
      initChat_post(
        {
          ...(convo?.topic && convo.topic !== "URL" && { topic: convo.topic }),
          ...(convo?.url && {
            url: convo.url,
          }),
          name: convo.name,
          email: convo.email,
          message: msg,
        },
        { params: { ":chat_id": "" } }
      )
        .then(({ data }) => {
          if (!data.success) {
            return pushToast.error(data.message);
          }
          localStorage.setItem("comify_chat_id", data.data._id);
          setConvo({ ...data.data, messages: undefined });
          msgChannel.postMessage({ messages: data.data.messages.reverse() });
          setMessages(data.data.messages);
        })
        .catch((err) => pushToast.error(err.message));
    },
    [convo]
  );

  return (
    <div
      className={`${s.chat} ${fullScreen ? s.fullScreen : ""}`}
      ref={chatRef}
    >
      <div className={s.header}>
        {convo?.topic && (
          <button
            className={s.clearBtn}
            onClick={() => {
              setUser(convo.user);
              setConvo(null);
              msgChannel.postMessage({ messages: [] });
              setInitMessages(generateMessages({ topics }));
              setMessages([]);
              localStorage.removeItem("comify_chat_id");
            }}
          >
            <Icon name="clear" />

            <span title={convo.topic} className={s.title}>
              {convo.url ? "URL" : convo.topic}
            </span>
          </button>
        )}
        <div className={s.right}>
          <button
            className={s.home}
            onClick={() => {
              messagesRef.current.scrollTop = -messagesRef.current.scrollHeight;
            }}
          >
            <Icon name="home" />
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
              <Icon
                className={s.fullScreen}
                name={fullScreen ? "contract" : "expand"}
              />
            </button>
          )}
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
            <Icon name="close" />
          </button>
        </div>
      </div>

      <div className={s.messages} ref={messagesRef}>
        {(convo?._id ? [...messages, ...initMessages] : initMessages).map(
          (item, i, arr) =>
            item.type === "suggestion" ? (
              <Suggestions
                key={item._id}
                options={[...item.options, "URL"]}
                active={convo?.url ? "URL" : convo?.topic}
                onChange={async (input) => {
                  await wait(200);
                  const name = convo?.user?.name || convo?.name;
                  const email = convo?.user?.email || convo?.email;
                  setConvo({
                    topic: input,
                    name,
                    email,
                  });

                  setTimeout(() => (messagesRef.current.scrollTop = 0), 20);

                  if (!convo?._id) {
                    if (input === "URL") {
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          ...(name ? { name } : { askName: true }),
                          ...(email ? { email } : { askEmail: true }),
                          ...(name && email ? { askUrl: true } : {}),
                        })
                      );
                      return;
                    }
                    setInitMessages(
                      generateMessages({
                        topics,
                        topic: input,
                        ...(name ? { name } : { askName: true }),
                        ...(email ? { email } : { askEmail: true }),
                        ...(name && email ? { askQuery: true } : {}),
                      })
                    );
                  } else {
                    if (input === "URL") {
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          name: convo.user.name || convo.name,
                          email: convo.user.email || convo.email,
                          askUrl: true,
                        })
                      );
                    } else {
                      setInitMessages(
                        generateMessages({
                          topics,
                          topic: input,
                          input,
                          name: convo.user.name || convo.name,
                          email: convo.user.email || convo.email,
                          askQuery: true,
                        })
                      );
                    }

                    setMessages([]);
                    localStorage.removeItem("comify_chat_id");
                    messagesRef.current.scrollTop = 0;
                  }
                }}
              />
            ) : (
              <Message
                key={item._id}
                msg={item}
                loading={loading}
                style={{
                  marginBottom: arr[i - 1]?.role !== item.role ? 5 : 0,
                }}
                castVote={vote}
              />
            )
        )}
      </div>

      {!convo?._id &&
        (!convo?.name ||
          !convo?.email ||
          (convo?.topic === "URL" && !convo.url)) && (
          <ChatForm
            inputOptions={{
              type:
                convo?.topic === "URL" && !convo?.url
                  ? "text"
                  : convo?.name
                  ? "email"
                  : "",
              readOnly: !(convo?.topic || convo?.url),
            }}
            onSubmit={async (values, options) => {
              await wait(200);
              if (convo?.topic === "URL" && !convo.url) {
                const name = convo?.name;
                const email = convo?.email;
                setInitMessages(
                  generateMessages({
                    topics,
                    topic: convo.topic,
                    url: values.msg.startsWith("http")
                      ? values.msg
                      : "http://" + values.msg,
                    ...(name ? { name } : { askName: true }),
                    ...(email ? { email } : { askEmail: true }),
                    ...(name && email ? { askQuery: true } : {}),
                  })
                );
                setConvo((prev) => ({ ...prev, url: values.msg }));
                options.clearForm();
              } else if (!convo.name) {
                setInitMessages(
                  generateMessages({
                    topics,
                    topic: convo.topic,
                    name: values.msg,
                    askEmail: true,
                  })
                );
                setConvo((prev) => ({ ...prev, name: values.msg }));
              } else if (!convo.email) {
                setInitMessages(
                  generateMessages({
                    topics,
                    topic: convo.topic,
                    name: convo.user,
                    email: values.msg,
                    askQuery: true,
                  })
                );
                setConvo((prev) => ({ ...prev, email: values.msg }));
              }
              options.clearForm();
              setTimeout(() => (messagesRef.current.scrollTop = 0), 20);
            }}
            scrollDown={() => {
              messagesRef.current.scrollTop = 0;
            }}
          />
        )}

      {!convo?._id &&
        (convo?.topic === "URL" ? convo.url : convo?.topic) &&
        convo?.name &&
        convo?.email && (
          <ChatForm
            onSubmit={(values, options) => {
              initChat(values.msg);
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
    </div>
  );
};

const Avatar = ({ onClick }) => {
  const { endpoints } = useContext(ChatContext);
  return (
    <div className={s.avatar} onClick={onClick}>
      {/* <img
        src={endpoints.baseUrl + "/assets/sdk/comify-chat-avatar/circle.webp"}
      /> */}
      <div className={s.circle} />
      <img
        className={s.hand}
        src={endpoints.baseUrl + "/assets/sdk/comify-chat-avatar/hand.webp"}
      />
      <img
        src={endpoints.baseUrl + "/assets/sdk/comify-chat-avatar/body.webp"}
      />
      <img
        className={s.head}
        src={endpoints.baseUrl + "/assets/sdk/comify-chat-avatar/head.webp"}
      />
    </div>
  );
};

const Message = ({ msg, castVote, loading, style }) => {
  return (
    <div className={`${s.msg} ${s[msg.role]}`} style={style}>
      <p className={s.content}>{msg.content}</p>
      {msg.role === "assistant" && (
        <div className={s.actions}>
          <CopyBtn content={msg.content} />
          <button
            className={s.btn}
            title="Like"
            disabled={loading}
            onClick={() => castVote(msg._id, msg.like ? null : true)}
          >
            <Icon name={msg.like ? "thumbs-up" : "thumbs-up-outlined"} />
          </button>
          <button
            className={s.btn}
            title="Dislike"
            disabled={loading}
            onClick={() => castVote(msg._id, msg.like === false ? null : false)}
          >
            <Icon
              name={msg.like === false ? "thumbs-down" : "thumbs-down-outlined"}
            />
          </button>
        </div>
      )}
    </div>
  );
};

const Suggestions = ({ options, active, onChange }) => {
  return (
    <div className={s.suggestions} style={{ marginBottom: ".3rem" }}>
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
      <Icon
        className={!done ? s.clipboard : ""}
        name={done ? "check" : "clipboard"}
      />
    </button>
  );
};

const ChatForm = ({
  inputOptions,
  scrollDown,
  onSubmit,
  loading: defaultLoading,
}) => {
  const { endpoints, convo, setMessages, msgChannel, pushToast } =
    useContext(ChatContext);
  const [msg, setMsg] = useState("");
  const { post: sendMessage, loading } = useFetch(endpoints.chat);
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
              },
              ...prev,
            ];
            msgChannel.postMessage({ messages });
            return messages;
          });
          setMsg("");
          setTimeout(() => scrollDown(), 50);
        })
        .catch((err) => pushToast.error(err.message));
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
          <Icon name="send" />
        )}
      </button>
    </form>
  );
};
