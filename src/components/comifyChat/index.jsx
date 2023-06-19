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
import { ChatContextProvider, ChatContext } from "./context.js";
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

  return (
    <div
      className={`${s.chat} ${fullScreen ? s.fullScreen : ""}`}
      ref={chatRef}
    >
      <div className={s.header}>
        {convo && (
          <button
            className={s.clearBtn}
            onClick={() => {
              setUser(convo.user);
              setConvo(null);
              msgChannel.postMessage({ messages: [] });
              setMessages([]);
              localStorage.removeItem("comify_chat_id");
            }}
          >
            <Icon name="arrow-left" />
          </button>
        )}
        <div className={s.right}>
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

      {!convo ? (
        <ConvoForm />
      ) : messages.length === 0 ? (
        <div className={s.messages} ref={messagesRef}>
          <p className={s.placeholder}>No message yet!</p>
        </div>
      ) : (
        <div className={s.messages} ref={messagesRef}>
          {messages.map((item, i, arr) => (
            <Message
              key={item._id}
              msg={item}
              loading={loading}
              style={{
                marginBottom: arr[i - 1]?.role !== item.role ? 5 : 0,
              }}
              castVote={vote}
            />
          ))}
        </div>
      )}

      {convo && (
        <ChatForm
          scrollDown={() => {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
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

const ChatForm = ({ scrollDown }) => {
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
        })
        .catch((err) => pushToast.error(err.message));
    },
    [msg]
  );
  return (
    <form className={s.chatForm} onSubmit={submit}>
      <input
        placeholder="Type a message"
        value={msg}
        readOnly={loading}
        onChange={(e) => setMsg(e.target.value)}
        className={s.input}
      />
      <button className={s.sendBtn} disabled={loading || !msg.trim()}>
        {loading ? (
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

const ConvoForm = () => {
  const {
    user,
    setMessages,
    msgChannel,
    endpoints,
    setConvo,
    topics,
    pushToast,
  } = useContext(ChatContext);
  const [errors, setErrors] = useState({});
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [msg, setMsg] = useState("");

  const { post: initChat, loading } = useFetch(endpoints.chat);

  const submit = useCallback(
    (e) => {
      e.preventDefault();

      if (!source) {
        return setErrors((prev) => ({
          ...prev,
          source: "Please select a source",
        }));
      }

      if (source === "topic" && !topic) {
        return setErrors((prev) => ({
          ...prev,
          topic: "Please select a topic",
        }));
      }
      if (source === "url" && !url) {
        return setErrors((prev) => ({
          ...prev,
          url: "Please provide an URL",
        }));
      }

      initChat(
        {
          ...(topic && { topic }),
          ...(url && { url: url.startsWith("http") ? url : "http://" + url }),
          name,
          email,
          message: msg,
        },
        {
          params: {
            ":chat_id": "",
          },
        }
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
    [topic, name, source, email, url, msg]
  );

  return (
    <form className={s.convoForm} onSubmit={submit}>
      <section>
        <label className={s.label}>Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={s.input}
        />
      </section>
      <section>
        <label className={s.label}>Email</label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={s.input}
        />
      </section>

      <section className={s.sources}>
        <label htmlFor="topic" className={s.label}>
          Source:
        </label>
        {
          <div className={s.radio}>
            <label htmlFor="topic" className={s.radioLabel}>
              <input
                id="topic"
                type="radio"
                value="topic"
                checked={source === "topic"}
                disabled={topics.length === 0}
                onChange={(e) => {
                  setSource(e.target.value);
                  setErrors((prev) => ({ ...prev, source: undefined }));
                }}
              />
              Topic
            </label>
          </div>
        }
        <div className={s.radio}>
          <label htmlFor="url" className={s.radioLabel}>
            <input
              id="url"
              type="radio"
              value="url"
              checked={source === "url"}
              onChange={(e) => {
                setSource(e.target.value);
                setErrors((prev) => ({ ...prev, source: undefined }));
              }}
            />
            URL
          </label>
        </div>
        {errors.source && <p className={s.err}>{errors.source}</p>}
      </section>

      {source === "topic" && (
        <section className={s.topics}>
          <label className={s.label}>Pick a Topic</label>
          <ul className={s.list}>
            {topics.map((item) => (
              <li
                key={item}
                className={`${s.topic} ${topic === item ? s.active : ""}`}
                onClick={() => {
                  setTopic(item);
                  setErrors((prev) => ({ ...prev, topic: undefined }));
                }}
              >
                {item}
              </li>
            ))}
          </ul>
          {errors.topic && <p className={s.err}>{errors.topic}</p>}
        </section>
      )}

      {source === "url" && (
        <section>
          <label className={s.label}>URL</label>
          <input
            required
            // type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={s.input}
          />
        </section>
      )}

      <section>
        <label className={s.label}>Message</label>
        <textarea
          required
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className={s.textarea}
        />
      </section>
      <button className={s.btn} disabled={loading}>
        {loading ? (
          <>
            <span className={s.dot} />
            <span className={s.dot} />
            <span className={s.dot} />
          </>
        ) : (
          "Submit"
        )}
      </button>
    </form>
  );
};
