import type { StorageMode } from "../types";
import * as fsBackend from "./fs";
import * as blobBackend from "./blob";

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const backend = useBlob ? blobBackend : fsBackend;

export const storageMode: StorageMode = useBlob ? "blob" : "filesystem";

export const listNotes = backend.listNotes;
export const getNote = backend.getNote;
export const readNoteContent = backend.readNoteContent;
export const createNote = backend.createNote;
export const deleteNote = backend.deleteNote;
export const updateNoteTitle = backend.updateNoteTitle;
