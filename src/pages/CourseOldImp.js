import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Helmet } from "react-helmet";
import { io } from "socket.io-client";
import { Peer } from "peerjs";
import Draggable from "react-draggable";
import { useReactMediaRecorder } from "react-media-recorder";
import Webcam from "react-webcam";
// contexts
import AppContext from "../contexts/AppContext";
// components
import ChatBox from "../components/ChatBox";
import Chart from "../components/Chart";
// constants
import { COMPANY } from "../constants/vars";
import {
  BASE,
  COURSE_GET_ENDPOINT,
  LECTURE_GET_ENDPOINT,
  LECTURE_NEW_ENDPOINT,
  FILE_UPLOAD_ENDPOINT,
  ATTENDANCE_NEW_ENDPOINT,
  MATERIAL_GET_ENDPOINT,
  MATERIAL_NEW_ENDPOINT,
} from "../constants/endpoints";
import { UPLOAD_URL } from "../constants/urls";
//utils
import { truncate } from "../utils";
// apis
import { getDoubtsFromImage, getAttendanceFromImage } from "../apis/multimedia";
// mui
import {
  Box,
  Container,
  Grid,
  Paper,
  Button,
  Typography,
  List,
  ListItemText,
  Stack,
  CardMedia,
  Dialog,
  DialogContent,
  DialogTitle,
  Tooltip,
  Badge,
  IconButton,
  TextField,
  ListItemButton,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import {
  VideoCall,
  Videocam,
  VideocamOff,
  Save,
  Close,
  Camera,
  Refresh,
  Add,
  FileCopy,
} from "@mui/icons-material";
// vars
let varStream;
const socket = io(BASE);

function PaperComponent(props) {
  return (
    <Draggable
      handle="#draggable-dialog-title"
      cancel={'[class*="MuiDialogContent-root"]'}
    >
      <Paper {...props} />
    </Draggable>
  );
}

const Course = () => {
  const myStreamRef = useRef(null);
  const peerStreamRef = useRef(null);
  const { token, user } = useContext(AppContext);
  const { courseId } = useParams();
  const [lectureOpen, setLectureOpen] = useState(false);
  const [doubtsOpen, setDoubtsOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [course, setCourse] = useState(null);
  const [lecture, setLecture] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [messages, setMessages] = useState([]);
  const [doubts, setDoubts] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [materialFiles, setMaterialsFiles] = useState([]);
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({ video: true, audio: true });

  useEffect(() => {
    const interval = setInterval(() => {
      setChartData((prev) => [
        ...prev,
        { doubts: 0, time: new Date().toLocaleTimeString() },
      ]);
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (courseId) {
      try {
        const query = { _id: courseId };
        axios
          .get(COURSE_GET_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` },
            params: { query: JSON.stringify(query) },
          })
          .then((res) => {
            if (res.data.data.length) setCourse(res.data.data[0]);
            else setCourse(null);
          })
          .catch((err) => {
            console.log(err);
            setCourse(null);
          });
      } catch (err) {
        console.log(err);
        setCourse(null);
      }
    }
  }, [courseId]);

  useEffect(() => {
    if (course) {
      // fetch lectures
      try {
        const query = { course: course._id };
        axios
          .get(LECTURE_GET_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` },
            params: { query: JSON.stringify(query) },
          })
          .then((res) => {
            if (res.data.data.length) {
              setLecture(null);
              setLectures(res.data.data);
            } else {
              setLecture(null);
              setLectures([]);
            }
          })
          .catch((err) => {
            console.log(err);
            setLecture(null);
            setLectures([]);
          });
      } catch (err) {
        console.log(err);
        setLectures([]);
      }
      // fetch materials
      try {
        const query = { course: course._id };
        axios
          .get(MATERIAL_GET_ENDPOINT, {
            headers: { Authorization: `Bearer ${token}` },
            params: { query: JSON.stringify(query) },
          })
          .then((res) => {
            if (res.data.data.length) {
              setMaterials(res.data.data[0].files || []);
            } else {
              setMaterials([]);
            }
          })
          .catch((err) => {
            console.log(err);
            setMaterials([]);
          });
      } catch (err) {
        console.log(err);
        setMaterials([]);
      }
    }
  }, [course]);

  useEffect(() => {
    socket.on("doubts", ({ doubts, date }) => {
      setChartData((prev) => [
        ...prev,
        { doubts, time: new Date(date).toLocaleTimeString() },
      ]);
    });
    socket.on("message", ({ from, fromName, text, date }) => {
      setMessages((messages) => [...messages, { from, fromName, text, date }]);
    });
    // my stream
    if (user?._id && isLive) {
      window.navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          varStream = stream;
          if (myStreamRef.current) {
            console.log("my stream");
            myStreamRef.current.srcObject = stream;
            // set up peer for receiving livestream
            const peer = new Peer();
            socket.on("stream", ({ peerId }) => {
              console.log("stream");
              if (peerId) {
                const call = peer.call(peerId, stream);
                call.on("stream", (peerStream) => {
                  console.log("on stream");
                  if (peerStreamRef.current) {
                    peerStreamRef.current.srcObject = peerStream;
                  }
                });
              }
            });
            // set up peer for sending livestream
            if (user?.role === "teacher") {
              const peer = new Peer();
              peer.on("open", (id) => {
                console.log("teacher stream");
                socket.emit("stream", { room: courseId, peerId: id });
              });
              peer.on("call", (call) => {
                call.answer(stream);
                call.on("stream", (peerStream) => {
                  console.log("teacher peer stream");
                  if (peerStreamRef.current) {
                    peerStreamRef.current.srcObject = peerStream;
                  }
                });
              });
            }
          }
        });
    }
    // join room
    socket.emit("join", { room: courseId });
    // reset
    return () => {
      socket.off();
    };
  }, [user, isLive, refresh]);

  useEffect(() => {
    if (mediaBlobUrl) {
      const recording = {
        title: "Recording - " + (recordings.length + 1),
        url: mediaBlobUrl,
        date: new Date().toISOString(),
      };
      setRecording(recording);
      setRecordings((recordings) => [recording, ...recordings]);
    }
  }, [mediaBlobUrl]);

  useEffect(() => {
    (async () => {
      if (capturedImage) {
        setIsLoading(true);
        try {
          const imageBlob = await fetch(capturedImage).then((r) => r.blob());
          const doubts = await getDoubtsFromImage(imageBlob);
          const attendance = await getAttendanceFromImage(imageBlob);
          setDoubts(doubts);
          setAttendance(attendance);
          setIsLoading(false);
        } catch (err) {
          setIsLoading(false);
          console.log(err);
        }
      }
    })();
  }, [capturedImage]);

  const endMediaDevices = async () => {
    if (varStream) varStream.getTracks().forEach((track) => track.stop());
  };

  const captureImage = () => {
    const capturedImage = myStreamRef.current.getScreenshot();
    setCapturedImage(capturedImage);
    setDoubtsOpen(true);
  };

  const handleMessage = (e) => {
    if (e?.preventDefault) {
      e.preventDefault();
      const text = e.target.text.value;
      socket.emit("message", {
        room: courseId,
        from: user._id,
        fromName: user.name,
        text,
      });
      e.target.reset();
    } else if (typeof e === "string") {
      socket.emit("message", {
        room: courseId,
        from: user._id,
        fromName: user.name,
        text: e,
      });
    } else {
      console.log("error in handling message");
    }
  };

  const handleLecture = async (e) => {
    e.preventDefault();
    if (recording) {
      const edits = {};
      new FormData(e.target).forEach((value, key) => (edits[key] = value)); // FormData to JS object
      const mediaBlob = await fetch(recording.url).then((r) => r.blob());
      const formData = new FormData();
      const fileName =
        user.role + "." + user.email + ".lecture." + edits.name + ".mp4";
      formData.append("files", mediaBlob, fileName);
      await fetch(FILE_UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          const url = Object.values(data.data)[0];
          if (url) {
            edits["url"] = fileName;
            edits["course"] = courseId;
            edits["date"] = new Date().toISOString();
            try {
              setIsLoading(true);
              axios
                .post(LECTURE_NEW_ENDPOINT, edits, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .then((res) => {
                  alert("Your lecture has been uploaded!");
                  setLectures((lectures) => [res.data.data, ...lectures]);
                  setLectureOpen(false);
                  setRecording(null);
                  setIsLoading(false);
                })
                .catch((err) => {
                  alert("Your lecture has NOT been updated!");
                  setLectureOpen(false);
                  setRecording(null);
                  setIsLoading(false);
                });
            } catch (err) {
              alert("Your lecture has NOT been updated!");
              setLectureOpen(false);
              setRecording(null);
              setIsLoading(false);
            }
          }
        });
    }
  };

  const handleMaterials = async (e) => {
    e.preventDefault();
    const data = {};
    new FormData(e.target).forEach((value, key) => (data[key] = value));
    // upload files
    const formData = new FormData(),
      fileNames = [];
    // change file name for each file before uploading
    materialFiles.forEach((file, index) => {
      const fileName =
        user.role +
        "." +
        user.email +
        ".material." +
        data.name +
        "." +
        index +
        "." +
        file.name.split(".").at(-1);
      fileNames.push(fileName);
      formData.append("files", file, fileName);
    });
    try {
      setIsLoading(true);
      axios
        .post(FILE_UPLOAD_ENDPOINT, formData, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const urls = Object.values(res.data.data);
          if (urls.length) {
            const materialData = {};
            materialData["name"] = data["name"];
            materialData["files"] = fileNames;
            materialData["course"] = courseId;
            axios
              .post(MATERIAL_NEW_ENDPOINT, materialData, {
                headers: { Authorization: `Bearer ${token}` },
              })
              .then((res) => {
                setMaterials(res.data.data.files);
                setMaterialsOpen(false);
                setIsLoading(false);
              })
              .catch((err) => {
                alert("Your study materials have NOT been uploaded!");
                setMaterialsFiles([]);
                setMaterialsOpen(false);
                setIsLoading(false);
              });
          }
        })
        .catch((err) => {
          alert("Your study materials have NOT been uploaded!");
          setMaterialsFiles([]);
          setMaterialsOpen(false);
          setIsLoading(false);
        });
    } catch (err) {
      alert("Your study materials have NOT been uploaded!");
      setMaterialsFiles([]);
      setMaterialsOpen(false);
      setIsLoading(false);
    }
  };

  const handleDoubts = async () => {
    socket.emit("doubts", { room: courseId, doubts });
    setDoubtsOpen(false);
    setCapturedImage(null);
  };

  const handleAttendance = async () => {
    if (lecture?._id && attendance?.length) {
      console.log(attendance);
      try {
        axios
          .post(
            ATTENDANCE_NEW_ENDPOINT,
            { coordinator: user?._id, lecture: lecture._id, attendance },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          .then((res) => {
            setAttendance([]);
            setDoubtsOpen(false);
            setCapturedImage(null);
          })
          .catch((err) => {
            setDoubtsOpen(false);
            alert("Attendance has NOT been taken!");
          });
      } catch (err) {
        setDoubtsOpen(false);
        alert("Attendance has NOT been taken!");
        console.log(err);
      }
    }
  };

  return (
    <Container maxWidth="100%">
      <Helmet>
        <title>
          {course?.name || "Course"} | {COMPANY}
        </title>
      </Helmet>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={8}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} pb={2}>
                  <Typography
                    color="primary"
                    variant="h6"
                    flex={1}
                    gutterBottom
                  >
                    Live Class
                  </Typography>
                  {user?.role === "teacher" ? (
                    <Button
                      disabled={!isLive}
                      color={
                        status === "idle" || status === "stopped"
                          ? "success"
                          : "error"
                      }
                      variant="outlined"
                      startIcon={
                        status === "idle" || status === "stopped" ? (
                          <Videocam />
                        ) : (
                          <VideocamOff />
                        )
                      }
                      onClick={() =>
                        status === "idle" || status === "stopped"
                          ? startRecording()
                          : stopRecording()
                      }
                    >
                      {status === "idle" || status === "stopped"
                        ? "Start"
                        : "Stop"}
                    </Button>
                  ) : null}
                  {user?.role === "teacher" ? (
                    <Button
                      variant="contained"
                      color={!isLive ? "primary" : "error"}
                      startIcon={<VideoCall />}
                      onClick={() => {
                        if (!isLive) {
                          setIsLive(true);
                          setLecture(null);
                        } else {
                          setIsLive(false);
                          setLecture(null);
                          endMediaDevices();
                        }
                      }}
                    >
                      {!isLive ? "Go Live" : "Disconnect"}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color={!isLive ? "primary" : "error"}
                      startIcon={<VideoCall />}
                      onClick={() => {
                        if (!isLive) {
                          setIsLive(true);
                          setLecture(null);
                        } else {
                          setIsLive(false);
                          setLecture(null);
                          endMediaDevices();
                        }
                      }}
                    >
                      {!isLive ? "Join Class" : "Disconnect"}
                    </Button>
                  )}
                </Stack>
                <Stack direction="row" alignItems="center">
                  {!isLive && lecture ? (
                    <video
                      src={UPLOAD_URL + lecture.url}
                      controls
                      style={{
                        width: "100%",
                        height: "300px",
                        objectFit: "cover",
                        borderRadius: "5px",
                      }}
                    />
                  ) : null}
                  {isLive && user?.role === "teacher" ? (
                    <video
                      autoPlay
                      muted
                      ref={myStreamRef}
                      style={{
                        width: "100%",
                        height: "300px",
                        objectFit: "cover",
                        borderRadius: "5px",
                      }}
                    />
                  ) : null}
                  {isLive && user?.role !== "teacher" ? (
                    <video
                      autoPlay
                      ref={peerStreamRef}
                      style={{
                        width: "100%",
                        height: "300px",
                        objectFit: "cover",
                        borderRadius: "5px",
                      }}
                    />
                  ) : null}
                  {user?.role !== "teacher" ? (
                    <div
                      style={{
                        position: "fixed",
                        zIndex: 9999,
                        bottom: 16,
                        right: 16,
                        borderRadius: "5px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          height: "200px",
                          width: "200px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Webcam
                          ref={myStreamRef}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            objectFit: "cover",
                          }}
                          height={200}
                          width={200}
                          muted
                        />
                        <IconButton
                          sx={{
                            position: "absolute",
                            transition: "all 0.2s",
                            backgroundColor: "rgba(0, 0, 0, 0.5) !important",
                            "&:hover": { transform: "scale(1.1)" },
                          }}
                          onClick={captureImage}
                        >
                          <Camera sx={{ color: "white" }} />
                        </IconButton>
                      </div>
                    </div>
                  ) : null}
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={user?.role === "teacher" ? 4 : 12}>
              <Paper sx={{ p: 2 }}>
                <Typography color="primary" variant="h6" flex={1} gutterBottom>
                  Discussion
                </Typography>
                <ChatBox
                  messages={messages}
                  handleMessage={handleMessage}
                  setMessages={setMessages}
                />
              </Paper>
            </Grid>
            {user?.role === "teacher" ? (
              <Grid item xs={12} sm={8}>
                <Paper sx={{ p: 2 }}>
                  <Typography
                    color="primary"
                    variant="h6"
                    flex={1}
                    gutterBottom
                  >
                    Live Doubts
                  </Typography>
                  <div style={{ width: "100%", height: "300px" }}>
                    <Chart data={chartData} />
                  </div>
                </Paper>
              </Grid>
            ) : null}
          </Grid>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Grid container spacing={2}>
            {recordings.length ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    mb={2}
                  >
                    <Typography color="primary" variant="h6" gutterBottom>
                      Recordings
                    </Typography>
                    <LoadingButton
                      disabled={isLoading}
                      loading={isLoading}
                      color="success"
                      variant="contained"
                      startIcon={<Save />}
                      onClick={() => setLectureOpen(true)}
                    >
                      Save
                    </LoadingButton>
                  </Stack>
                  {recording ? (
                    <video
                      src={recording.url}
                      controls
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "5px",
                      }}
                    />
                  ) : null}
                  <Box sx={{ width: "100%", p: 1, pt: 2 }}>
                    {recordings.map((rec, index) => (
                      <Tooltip
                        title={
                          rec.title +
                          " - " +
                          new Date(rec.date).toLocaleString()
                        }
                      >
                        <Badge
                          onClick={() => setRecording(rec)}
                          badgeContent={recordings.length - index}
                          color="secondary"
                          sx={{ mr: 2, cursor: "pointer" }}
                        >
                          <Save
                            color={
                              rec.date === recording?.date
                                ? "error"
                                : "text.secondary"
                            }
                            fontSize="large"
                          />
                        </Badge>
                      </Tooltip>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent={"space-between"}
                  alignItems="center"
                  spacing={1}
                >
                  <Typography color="primary" variant="h6" gutterBottom>
                    Lectures
                  </Typography>
                  {user?.role === "teacher" ? (
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={() => {
                        setRefresh((refresh) => !refresh);
                      }}
                    >
                      Refresh
                    </Button>
                  ) : null}
                </Stack>
                {lectures.length ? (
                  <List sx={{ width: "100%" }}>
                    {lectures.map((lecture) => (
                      <ListItemButton
                        alignItems="flex-start"
                        onClick={() => {
                          setIsLive(false);
                          setLecture(lecture);
                        }}
                      >
                        <ListItemText
                          primary={lecture.name}
                          secondary={truncate(lecture.description, 50)}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                ) : (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    align="center"
                    sx={{ py: "50px" }}
                  >
                    No lectures yet!
                  </Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent={"space-between"}
                  alignItems="center"
                  spacing={1}
                >
                  <Typography color="primary" variant="h6" gutterBottom>
                    Study Materials
                  </Typography>
                  {user?.role === "teacher" ? (
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setMaterialsOpen(true)}
                    >
                      New
                    </Button>
                  ) : null}
                </Stack>
                <Box sx={{ width: "100%", p: 1, pt: 2 }}>
                  {materials.map((material, index) => (
                    <Badge
                      onClick={() => window.open(UPLOAD_URL + material)}
                      badgeContent={materials.length - index}
                      color="secondary"
                      sx={{ mr: 2, cursor: "pointer" }}
                    >
                      <FileCopy color="error" fontSize="large" />
                    </Badge>
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Dialog
        open={materialsOpen}
        onClose={() => setMaterialsOpen(false)}
        PaperComponent={PaperComponent}
      >
        <DialogTitle style={{ cursor: "move" }} id="draggable-dialog-title">
          <Typography color="primary" variant="h6" gutterBottom>
            New Study Material
          </Typography>
        </DialogTitle>
        <IconButton
          onClick={() => setMaterialsOpen(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
        <DialogContent>
          <form onSubmit={handleMaterials}>
            <Grid container p={2} spacing={2}>
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      required
                      name="name"
                      label="Name"
                      fullWidth
                      variant="standard"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      type="file"
                      label="Files"
                      fullWidth
                      variant="outlined"
                      onChange={(e) =>
                        setMaterialsFiles(Array.from(e.target.files))
                      }
                      inputProps={{
                        multiple: true,
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <LoadingButton
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={isLoading}
                  loading={isLoading}
                  type="submit"
                  variant="contained"
                >
                  Upload
                </LoadingButton>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={lectureOpen}
        onClose={() => setLectureOpen(false)}
        PaperComponent={PaperComponent}
      >
        <DialogTitle style={{ cursor: "move" }} id="draggable-dialog-title">
          <Typography color="primary" variant="h6" gutterBottom>
            New Lecture
          </Typography>
        </DialogTitle>
        <IconButton
          onClick={() => setLectureOpen(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
        <DialogContent>
          <form onSubmit={handleLecture}>
            <Grid container p={2} spacing={2}>
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      required
                      name="name"
                      label="Name"
                      fullWidth
                      variant="standard"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      multiline
                      rows={4}
                      name="description"
                      label="Description"
                      fullWidth
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <LoadingButton
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={isLoading}
                  loading={isLoading}
                  type="submit"
                  variant="contained"
                >
                  {courseId === "new" ? "Create" : "Update"}
                </LoadingButton>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={doubtsOpen}
        onClose={() => setDoubtsOpen(false)}
        PaperComponent={PaperComponent}
      >
        <DialogTitle style={{ cursor: "move" }} id="draggable-dialog-title">
          <Typography color="primary" variant="h6" gutterBottom>
            Missed on something? Ask your doubts!
          </Typography>
        </DialogTitle>
        <IconButton
          onClick={() => setDoubtsOpen(false)}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <CardMedia
                    component="img"
                    image={capturedImage}
                    sx={{
                      width: "100%",
                      height: "auto",
                      objectFit: "cover",
                      borderRadius: "5px",
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    value={doubts}
                    onChange={(e) => setDoubts(e.target.value)}
                    label="Doubts"
                    fullWidth
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LoadingButton
                fullWidth
                disabled={isLoading}
                loading={isLoading}
                variant="contained"
                onClick={handleDoubts}
              >
                Send Doubts
              </LoadingButton>
            </Grid>
            <Grid item xs={12} sm={6}>
              <LoadingButton
                fullWidth
                disabled={isLoading || !lecture?._id}
                loading={isLoading}
                color="success"
                variant="contained"
                onClick={handleAttendance}
              >
                Take Attendance
              </LoadingButton>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Course;
