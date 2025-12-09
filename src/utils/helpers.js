// src/utils/helpers.js
export const getChatRoomId = (id1, id2) => {
  return [id1, id2].sort().join("_");
};

export const formatTime = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
