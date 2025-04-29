import React, { useState, useEffect, useRef, useContext } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
// apis
import AppContext from "../contexts/AppContext";
import { speechToText } from "../apis/multimedia";
import {
  MESSAGE_EDIT_ENDPOINT,
  MESSAGE_DELETE_ENDPOINT,
} from "../constants/endpoints";
// mui
import axios from "axios";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Mic, MicOff, Send, AudioFile } from "@mui/icons-material";
import ChatMessage from "./ChatMessage";
// vars
const mimeType = "audio/webm;codecs=opus";

const ChatBox = ({ sx, overlay, messages, handleMessage, setMessages }) => {
  const chatBoxRef = useRef(null);
  const { token } = useContext(AppContext);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState(null); // To handle recording errors

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    error: recorderError,
  } = useReactMediaRecorder({ audio: true });

  useEffect(() => {
    if (chatBoxRef.current)
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (recorderError) {
      setError("An error occurred while recording: " + recorderError);
    }
  }, [recorderError]);
  useEffect(() => {
    (async () => {
      if (mediaBlobUrl) {
        setIsLoading(true);
        try {
          const response = await fetch(mediaBlobUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = async (e) => {
            const blobWithMimeType = new Blob(
              [new Uint8Array(e.target.result)],
              { type: mimeType }
            );
            const text = await speechToText(blobWithMimeType, language); // Pass the selected language
            console.log(text);
            handleMessage(text);
            setIsLoading(false);
          };
          reader.readAsArrayBuffer(blob);
        } catch (err) {
          setIsLoading(false);
          console.log(err);
        }
      }
    })();
  }, [mediaBlobUrl]);

  const handleMic = () => {
    if ((status === "idle" || status === "stopped") && !isLoading) {
      setError(null); // Clear any previous error
      startRecording();
    } else if (status === "recording") {
      stopRecording();
    }
  };
  const handleAudioFile = () => {
    if (!isLoading) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";

      input.onchange = (e) => {
        const file = e.target.files[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = async (e) => {
            setIsLoading(true);
            try {
              // Create a Blob with the correct MIME type
              const blobWithMimeType = new Blob(
                [new Uint8Array(e.target.result)],
                { type: file.type }
              );

              // Call speechToText with blob and selected language
              const text = await speechToText(blobWithMimeType, language);

              if (text === "error") {
                setIsLoading(false);
              } else {
                handleMessage(text);
              }
            } catch (err) {
              console.log("Unexpected error while handling audio file:", err);
            } finally {
              setIsLoading(false); // Ensure loading is reset
            }
          };

          // Read the file as an ArrayBuffer
          reader.readAsArrayBuffer(file);
        }
      };

      input.click(); // Trigger file input dialog
    }
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };
  // Update a message after editing
  const handleEditMessage = (id, newText) => {
    console.log(id, newText);
    try {
      const data = {
        newText: newText,
        id: id,
      };
      axios
        .patch(MESSAGE_EDIT_ENDPOINT, data, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          //filter out the edited message and update text
          const updatedMessages = messages.map((message) => {
            if (message._id === id) {
              return { ...message, text: newText };
            }
            return message;
          });
          setMessages(updatedMessages);
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  };

  // Delete a message by id
  const handleDeleteMessage = (id) => {
    console.log(id);
    console.log("token", token);
    try {
      axios
        .delete(`${MESSAGE_DELETE_ENDPOINT}?_id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const updatedMessages = messages.filter(
            (message) => message._id !== id
          );
          console.log("updatedMessages", updatedMessages);
          console.log("setMessages", setMessages);
          setMessages(updatedMessages);
        })
        .catch((err) => {
          console.log(err);
        });
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <Box
      component="form"
      onSubmit={handleMessage}
      sx={{ ...sx, width: "100%" }}
    >
      <Stack
        ref={chatBoxRef}
        sx={{
          p: 2,
          height: "300px",
          overflowX: "hidden",
          background: overlay
            ? "linear-gradient(45deg, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0))"
            : "transparent",
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            display: overlay ? "none" : "auto",
          },
        }}
      >
        {messages &&
          messages.map((message) => (
            <ChatMessage
              key={message._id}
              overlay={overlay}
              message={message}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
            />
          ))}
      </Stack>
      <Stack direction="row" alignItems="flex-end">
        <IconButton onClick={handleAudioFile}>
          <AudioFile color="success" />
        </IconButton>

        <FormControl variant="standard" sx={{ minWidth: 80, mx: 1 }}>
          <Select value={language} onChange={handleLanguageChange}>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="hi">Hindi</MenuItem>
            <MenuItem value="ur">Urdu</MenuItem>
            <MenuItem value="bn">Bengali</MenuItem>
            <MenuItem value="ta">Tamil</MenuItem>
            <MenuItem value="te">Telugu</MenuItem>
            <MenuItem value="ml">Malayalam</MenuItem>
            <MenuItem value="kn">Kannada</MenuItem>
            <MenuItem value="gu">Gujarati</MenuItem>
            <MenuItem value="mr">Marathi</MenuItem>
            <MenuItem value="pa">Punjabi</MenuItem>
            <MenuItem value="or">Odia</MenuItem>
            <MenuItem value="as">Assamese</MenuItem>
          </Select>
        </FormControl>

        <IconButton onClick={handleMic}>
          {status === "idle" || status === "stopped" ? (
            <MicOff color="primary" />
          ) : (
            <Mic color="error" />
          )}
        </IconButton>
        <TextField
          fullWidth
          sx={{ mx: 1 }}
          variant="standard"
          label="Type your message."
          placeholder="Ex:- I have a doubt!"
          name="text"
          type="text"
        />
        {isLoading ? (
          <CircularProgress sx={{ height: "auto !important" }} />
        ) : (
          <IconButton type="submit">
            <Send />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};

export default ChatBox;
