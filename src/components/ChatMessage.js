import React, { useContext, useState } from "react";
// contexts
import AppContext from "../contexts/AppContext";
// mui
import { Stack, Typography } from "@mui/material";
import { Box, IconButton, TextField } from "@mui/material";
import { Edit, Delete, Check, Close } from "@mui/icons-material";

const ChatMessage = ({ overlay, message, onEdit, onDelete }) => {
  const { user } = useContext(AppContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    onDelete(message._id);
  };

  const handleSaveClick = () => {
    if (editText.trim() !== "") {
      onEdit(message._id, editText);
      setIsEditing(false);
    }
  };

  const handleCancelClick = () => {
    setEditText(message.text);
    setIsEditing(false);
  };
  return (
    <Box sx={{ mb: 1 }}>
      {isEditing ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <TextField
            fullWidth
            variant="standard"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <IconButton onClick={handleSaveClick}>
            <Check color="primary" />
          </IconButton>
          <IconButton onClick={handleCancelClick}>
            <Close color="error" />
          </IconButton>
        </Stack>
      ) : (
        <Stack
          sx={{
            width: "fit-content",
            mb: 2,
            ml: message.from === user?._id ? "auto" : "",
            mr: message.from !== user?._id ? "64px" : "",
          }}
        >
          <Stack direction="row" spacing={1}>
            <Typography
              variant="body1"
              color={overlay ? "white" : "text.primary"}
            >
              {message.fromName}
            </Typography>
            <IconButton onClick={handleEditClick} size="small">
              <Edit fontSize="small" />
            </IconButton>
            <IconButton onClick={handleDeleteClick} size="small">
              <Delete fontSize="small" />
            </IconButton>
          </Stack>
          <Typography
            variant="body1"
            sx={{
              color: "white",
              p: 1,
              borderRadius: "10px",
              backgroundColor: overlay
                ? "transparent"
                : message.from === user?._id
                ? "primary.main"
                : "secondary.main",
              paddingBottom: "32px",
              position: "relative",
            }}
          >
            {message.text}
            <Typography
              variant="body2"
              color="white"
              sx={{
                position: "absolute",
                right: 6,
                bottom: 6,
                fontSize: "10px",
              }}
            >
              {new Date(message.date).toLocaleString()}
            </Typography>
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default ChatMessage;
