export interface RAGDocument {
  title?: string;
  uri?: string;
  score?: number | string;
  content: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface RAGToolResponse {
  documents: RAGDocument[];
  totalResults: number;
  source: 'kendra' | 'knowledgebase';
  error?: string;
  [key: string]: any;
}
