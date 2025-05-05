export interface Note {
  id: string;
  name: string;
  content: string; // Will store the JSON stringified rich text content
  createdAt: Date;
  color?: string;
}