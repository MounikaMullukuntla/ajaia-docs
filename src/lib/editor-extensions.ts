import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

// One list of editor features, shared by the browser editor and the server-side
// file importer, so imported content only contains things the editor supports.
export const editorExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Underline,
];
