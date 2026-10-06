// Saved games, kept in the browser (localStorage) so a player can pick up
// where they left off. One slot per character:
//
//   { done: ["fire-alarm", ...],  missions finished, by id
//     x, z, heading,              where they were (restored on foot)
//     savedAt }                   ms timestamp
//
// Missions are recorded by id, not by position in the list, so missions
// added later just show up as not done yet. Storage can be unavailable
// (private browsing, blocked cookies); then the game simply doesn't save.

const KEY = "eagle-lake-save-v1";

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" && data.slots ? data : { slots: {}, last: null };
  } catch (e) {
    return { slots: {}, last: null };
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

// All saved slots: { sidney: {...}, bradshall: {...} }, and which was
// played last.
export function loadSaves() {
  const data = readAll();
  return { slots: data.slots, last: data.slots[data.last] ? data.last : null };
}

// Merge fields into a character's slot (creating it) and mark it last played.
export function saveSlot(character, fields) {
  const data = readAll();
  const slot = data.slots[character] || { done: [] };
  data.slots[character] = { ...slot, ...fields, savedAt: Date.now() };
  data.last = character;
  return writeAll(data);
}

// A finished mission.
export function saveMissionDone(character, id) {
  const slot = readAll().slots[character];
  const done = slot ? slot.done.slice() : [];
  if (!done.includes(id)) done.push(id);
  return saveSlot(character, { done });
}

// New game for this character: drop their slot.
export function clearSlot(character) {
  const data = readAll();
  delete data.slots[character];
  if (data.last === character) data.last = null;
  return writeAll(data);
}
