import React, { useContext } from "react";
import s from "./style.module.scss";
import { ChatContext } from "./context.js";
import { Close } from "./icons.js";

export const Toast = ({ id, type, message }) => {
  const { setToasts } = useContext(ChatContext);
  return (
    <div id={id} className={`${s.toast} ${s[type]}`}>
      <p>{message}</p>
      <button
        onClick={() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
          clearTimeout(window[`comify_toast_timeout_${id}`]);
          delete window[`comify_toast_timeout_${id}`];
        }}
      >
        <Close />
      </button>
    </div>
  );
};
